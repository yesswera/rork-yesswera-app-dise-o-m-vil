import { supabase } from '@/constants/supabase';

export interface CreateRatingData {
  orderId: string;
  raterId: string;
  ratedId: string;
  ratedType: 'driver' | 'business' | 'client';
  stars: number;
  comment?: string;
}

export interface Rating {
  id: string;
  orderId: string;
  raterId: string;
  ratedId: string;
  ratedType: string;
  stars: number;
  comment?: string;
  createdAt: string;
}

function mapRating(dbRating: any): Rating {
  return {
    id: dbRating.id,
    orderId: dbRating.order_id,
    raterId: dbRating.rater_id,
    ratedId: dbRating.rated_id,
    ratedType: dbRating.rated_type,
    stars: dbRating.stars,
    comment: dbRating.comment,
    createdAt: dbRating.created_at,
  };
}

export async function createRating(data: CreateRatingData): Promise<Rating> {
  try {
    const { data: rating, error } = await supabase
      .from('ratings')
      .insert({
        order_id: data.orderId,
        rater_id: data.raterId,
        rated_id: data.ratedId,
        rated_type: data.ratedType,
        stars: data.stars,
        comment: data.comment,
      })
      .select()
      .single();

    if (error) throw error;

    // Mark order as rated to prevent duplicate prompts
    await supabase
      .from('orders')
      .update({ rated: true })
      .eq('id', data.orderId);

    // Update the rated entity's average rating
    await updateAverageRating(data.ratedId, data.ratedType);

    return mapRating(rating);
  } catch (error) {
    console.error('createRating error:', error);
    throw error;
  }
}

export async function getRatingsForUser(userId: string, userType: string): Promise<Rating[]> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('rated_id', userId)
      .eq('rated_type', userType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapRating);
  } catch (error) {
    console.error('getRatingsForUser error:', error);
    throw error;
  }
}

export async function getRatingForOrder(orderId: string, ratedType: string): Promise<Rating | null> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('order_id', orderId)
      .eq('rated_type', ratedType)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapRating(data);
  } catch (error) {
    console.error('getRatingForOrder error:', error);
    throw error;
  }
}

async function updateAverageRating(userId: string, userType: string): Promise<void> {
  try {
    // Calculate new average
    const { data, error } = await supabase
      .from('ratings')
      .select('stars')
      .eq('rated_id', userId)
      .eq('rated_type', userType);

    if (error) throw error;

    if (data && data.length > 0) {
      const total = data.reduce((sum, r) => sum + r.stars, 0);
      const average = total / data.length;
      const count = data.length;

      // Update the appropriate table
      if (userType === 'driver') {
        await supabase
          .from('drivers')
          .update({ rating_average: average, rating_count: count })
          .eq('user_id', userId);
      } else if (userType === 'business') {
        await supabase
          .from('businesses')
          .update({ rating_average: average, rating_count: count })
          .eq('user_id', userId);
      }
    }
  } catch (error) {
    console.error('updateAverageRating error:', error);
    // Don't throw - this is a background operation
  }
}
