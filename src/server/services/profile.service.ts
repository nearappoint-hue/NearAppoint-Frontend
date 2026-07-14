import 'server-only';
import { db } from '@/server/database/client';
import { ApiError } from '@/server/lib/errors';

export interface Profile {
  display_name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  category: string;
  branch: {
    id: string;
    phone: string;
    whatsapp: string | null;
    address_line: string;
    landmark: string | null;
    area: string | null;
    city: string;
    gender_policy: 'women_only' | 'men_only' | 'unisex';
  };
  photos: { id: string; url: string; display_order: number }[];
  is_listed: boolean;
  /** What she still needs before customers can see her. */
  missing: string[];
}

export class ProfileService {
  static async get(businessId: string, branchId: string): Promise<Profile> {
    const sb = db();

    const [{ data: biz }, { data: branch }, { data: photos }] = await Promise.all([
      sb.from('businesses')
        .select('display_name, description, logo_url, cover_url, is_listed, service_categories(name_en)')
        .eq('id', businessId).single(),
      sb.from('branches')
        .select('id, phone, whatsapp, address_line, landmark, area, city, gender_policy')
        .eq('id', branchId).single(),
      sb.from('business_photos')
        .select('id, storage_path, display_order')
        .eq('business_id', businessId)
        .order('display_order'),
    ]);

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = (p: string) => `${base}/storage/v1/object/public/business-photos/${p}`;

    /**
     * A business cannot be LISTED to customers until this is complete.
     *
     * A search result with no photos, no prices and no landmark is worse than
     * no search result — the customer taps it, learns nothing, and stops
     * trusting the app. One bad first impression is expensive.
     */
    const missing: string[] = [];
    if (!biz!.description)   missing.push('A short description');
    if (!biz!.cover_url)     missing.push('A cover photo');
    if (!branch!.landmark)   missing.push('A landmark');
    if ((photos ?? []).length < 3) missing.push('At least 3 gallery photos');

    return {
      display_name: biz!.display_name,
      description: biz!.description,
      logo_url: biz!.logo_url,
      cover_url: biz!.cover_url,
      category: (biz as any).service_categories?.name_en ?? '',
      branch: branch as Profile['branch'],
      photos: (photos ?? []).map((p: any) => ({
        id: p.id, url: url(p.storage_path), display_order: p.display_order,
      })),
      is_listed: biz!.is_listed,
      missing,
    };
  }

  static async update(businessId: string, branchId: string, patch: Record<string, unknown>) {
    const biz: Record<string, unknown> = {};
    if (patch.display_name !== undefined) biz.display_name = String(patch.display_name).trim();
    if (patch.description !== undefined)  biz.description = String(patch.description ?? '').trim() || null;
    if (patch.cover_url !== undefined)    biz.cover_url = patch.cover_url;
    if (patch.logo_url !== undefined)     biz.logo_url = patch.logo_url;

    if (Object.keys(biz).length) {
      await db().from('businesses').update(biz).eq('id', businessId);
    }

    const br: Record<string, unknown> = {};
    if (patch.phone !== undefined)         br.phone = String(patch.phone).trim();
    if (patch.whatsapp !== undefined)      br.whatsapp = String(patch.whatsapp ?? '').trim() || null;
    if (patch.address_line !== undefined)  br.address_line = String(patch.address_line).trim();
    if (patch.landmark !== undefined)      br.landmark = String(patch.landmark ?? '').trim() || null;
    if (patch.area !== undefined)          br.area = String(patch.area ?? '').trim() || null;
    if (patch.city !== undefined)          br.city = String(patch.city).trim();
    if (patch.gender_policy !== undefined) br.gender_policy = patch.gender_policy;

    if (Object.keys(br).length) {
      await db().from('branches').update(br).eq('id', branchId);
    }
  }

  static async addPhoto(businessId: string, storagePath: string): Promise<string> {
    const { count } = await db().from('business_photos')
      .select('id', { count: 'exact', head: true }).eq('business_id', businessId);

    const { data, error } = await db().from('business_photos')
      .insert({ business_id: businessId, storage_path: storagePath, display_order: count ?? 0 })
      .select('id').single();

    if (error) throw new ApiError('INTERNAL', 'Could not save the photo.');
    return data.id;
  }

  static async removePhoto(businessId: string, photoId: string): Promise<void> {
    await db().from('business_photos')
      .delete().eq('id', photoId).eq('business_id', businessId);
  }
}
