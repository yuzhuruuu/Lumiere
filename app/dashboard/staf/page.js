// app/dashboard/staf/page.js
// Dashboard untuk role staf dan admin

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardStafPage() {
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
  
  // Hanya staf dan admin yang bisa akses
  if (!profile || (profile.role !== 'staf' && profile.role !== 'admin')) {
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
              Dashboard Staf
            </h1>
            <p style={{ color: '#6b7280' }}>
              Selamat datang, <strong>{profile.full_name}</strong> ({profile.role})
            </p>
          </div>
          <LogoutButton />
        </div>
        
        <div style={{
          background: '#fef3c7',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #f59e0b',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            ℹ️ Placeholder
          </h2>
          <p style={{ color: '#374151' }}>
            Halaman dashboard staf. Fitur validasi reservasi, check-in, dan manajemen pesanan akan ditambahkan nanti.
          </p>
        </div>
      </div>
    </div>
  )
}
