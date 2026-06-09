// Compatibility facade: exposes the exact same shape the app used from the Base44
// SDK (`base44.entities.<Name>.{list,filter,create,update,delete,get}` and
// `base44.auth.{me,logout,redirectToLogin}`), but backed entirely by Supabase.
//
// This is the "clean port" seam: every page/component still imports `{ base44 }`
// from here and calls the same methods, so none of the UI code had to change.
import { supabase } from '@/api/supabaseClient';

// Translate a Base44/Mongo-style filter object into a PostgREST query.
// Supported operators (the only ones the app actually uses): plain equality,
// and { $gte, $lte, $lt, $gt } range objects.
function applyFilter(query, filterObj = {}) {
  for (const [field, condition] of Object.entries(filterObj)) {
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('$gte' in condition) query = query.gte(field, condition.$gte);
      if ('$lte' in condition) query = query.lte(field, condition.$lte);
      if ('$gt' in condition) query = query.gt(field, condition.$gt);
      if ('$lt' in condition) query = query.lt(field, condition.$lt);
    } else {
      query = query.eq(field, condition);
    }
  }
  return query;
}

function entity(table) {
  return {
    // Return every row (callers sort client-side via sort_order, as before).
    async list() {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return data ?? [];
    },

    // Filter by an object of conditions (equality + $gte/$lte/$lt/$gt).
    async filter(filterObj) {
      let query = supabase.from(table).select('*');
      query = applyFilter(query, filterObj);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    // Insert one row, returning the created record (incl. generated id).
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },

    // Update one row by id, returning the updated record.
    async update(id, values) {
      const { data, error } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Delete one row by id.
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },

    // Fetch a single row by id.
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  };
}

export const base44 = {
  entities: {
    Worker: entity('worker'),
    Student: entity('student'),
    Assignment: entity('assignment'),
    Booking: entity('booking'),
    Absence: entity('absence'),
  },
  auth: {
    // The app's real access gate is the PIN (PinGate) + public pages, exactly as
    // on Base44 where auth was not required. me() resolves to the Supabase user if
    // one is signed in, otherwise throws — which the callers already treat as
    // "not authenticated" (try/catch), so behaviour is unchanged.
    async me() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw new Error('Not authenticated');
      const u = data.user;
      return {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name ?? u.email,
        role: u.user_metadata?.role ?? 'user',
      };
    },
    async logout() {
      await supabase.auth.signOut();
    },
    redirectToLogin() {
      // No external login flow in the ported app; the PIN gate handles access.
      // Kept as a no-op so existing call sites stay valid.
    },
  },
};
