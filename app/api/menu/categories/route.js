// app/api/menu/categories/route.js
// GET /api/menu/categories
// Endpoint publik: daftar kategori menu

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('id, name, sort_order, created_at')
      .order('sort_order')
    
    if (error) {
      console.error('Error fetching menu categories:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil kategori menu' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      categories: data,
      total: data.length,
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
