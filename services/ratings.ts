const API_BASE = 'http://192.168.100.3:3000/api';

export interface CreateRatingData {
  orderId: string;
  driverId: string;
  stars: number;
  comment?: string;
}

export async function createRating(data: CreateRatingData, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/ratings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al crear calificación');
  }
}
