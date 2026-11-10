// app/api/tables/route.js
// GET /api/tables?area=Indoor&min_capacity=4
// Endpoint publik: daftar meja dengan filter

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  // Query parameters untuk filter
  const area = searchParams.get('area') // Indoor, Outdoor, VIP
  const minCapacity = searchParams.get('min_capacity')
  const activeOnly = searchParams.get('active') !== 'false' // default true
  
  try {
    let query = supabase
      .from('dining_tables')
      .select('id, code, capacity, area, is_active, created_at')
    
    // Filter by area
    if (area) {
      query = query.eq('area', area)
    }
    
    // Filter by minimum capacity
    if (minCapacity) {
      query = query.gte('capacity', parseInt(minCapacity))
    }
    
    // Filter hanya meja aktif
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    // Order by area, then capacity
    query = query.order('area').order('capacity')
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching tables:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data meja' },
        { status: 500 }
      )
    }
    
    // Group by area untuk kemudahan frontend
    const groupedByArea = data.reduce((acc, table) => {
      if (!acc[table.area]) {
        acc[table.area] = []
      }
      acc[table.area].push(table)
      return acc
    }, {})
    
    return NextResponse.json({
      tables: data,
      grouped_by_area: groupedByArea,
      total: data.length,
      filters: {
        area: area,
        min_capacity: minCapacity,
        active_only: activeOnly,
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
