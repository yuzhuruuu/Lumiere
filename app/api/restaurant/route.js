// app/api/restaurant/route.js
// GET /api/restaurant
// Endpoint publik: info restoran + jam operasional

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    // Ambil info restoran (hanya 1 baris)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurant_profile')
      .select('*')
      .eq('id', 1)
      .single()
    
    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError)
      return NextResponse.json(
        { error: 'Gagal mengambil data restoran' },
        { status: 500 }
      )
    }
    
    // Ambil jam operasional (7 baris: Minggu-Sabtu)
    const { data: operatingHours, error: hoursError } = await supabase
      .from('operating_hours')
      .select('*')
      .order('day_of_week')
    
    if (hoursError) {
      console.error('Error fetching operating hours:', hoursError)
      return NextResponse.json(
        { error: 'Gagal mengambil jam operasional' },
        { status: 500 }
      )
    }
    
    // Mapping day_of_week ke nama hari dalam bahasa Indonesia
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    
    const formattedHours = operatingHours.map(hour => ({
      ...hour,
      day_name: dayNames[hour.day_of_week],
    }))
    
    return NextResponse.json({
      restaurant,
      operating_hours: formattedHours,
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
