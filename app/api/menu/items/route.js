// app/api/menu/items/route.js
// GET /api/menu/items?category_id=9001&available=true
// Endpoint publik: daftar menu items dengan filter

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  // Query parameters untuk filter
  const categoryId = searchParams.get('category_id')
  const availableOnly = searchParams.get('available') === 'true'
  const search = searchParams.get('search')
  
  try {
    let query = supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        price,
        photo_path,
        is_available,
        category_id,
        menu_categories (
          id,
          name
        )
      `)
    
    // Filter by category
    if (categoryId) {
      query = query.eq('category_id', parseInt(categoryId))
    }
    
    // Filter hanya yang available
    if (availableOnly) {
      query = query.eq('is_available', true)
    }
    
    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    // Order by category sort_order, then name
    query = query.order('name')
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil menu' },
        { status: 500 }
      )
    }
    
    // Format data agar lebih clean
    const formattedData = data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      photo_path: item.photo_path,
      is_available: item.is_available,
      category: {
        id: item.menu_categories.id,
        name: item.menu_categories.name,
      },
    }))
    
    return NextResponse.json({
      items: formattedData,
      total: formattedData.length,
      filters: {
        category_id: categoryId,
        available_only: availableOnly,
        search: search,
      },
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
