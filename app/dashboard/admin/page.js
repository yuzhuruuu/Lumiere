// app/dashboard/admin/page.js
// Dashboard untuk role admin saja

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardAdminPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  
  // Hanya admin yang bisa akses
  if (!profile || profile.role !== 'admin') {
    redirect(`/dashboard/${profile?.role || 'pelanggan'}`)
  }
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e5e7eb',
        }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Dashboard Admin
            </h1>
            <p style={{ color: '#6b7280' }}>
              Selamat datang, <strong>{profile.full_name}</strong>
            </p>
          </div>
          <LogoutButton />
        </div>
        
        <div style={{
          background: '#fce7f3',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #ec4899',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            ℹ️ Placeholder
          </h2>
          <p style={{ color: '#374151' }}>
            Halaman dashboard admin. Fitur CRUD menu, meja, jam operasional, dan manajemen user akan ditambahkan nanti.
          </p>
        </div>
      </div>
    </div>
  )
}
