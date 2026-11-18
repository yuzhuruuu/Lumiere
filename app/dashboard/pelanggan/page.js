// app/dashboard/pelanggan/page.js
// Dashboard untuk role pelanggan

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPelangganPage() {
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
  
  if (!profile || profile.role !== 'pelanggan') {
    redirect(`/dashboard/${profile?.role || 'pelanggan'}`)
  }
  
  // Ambil riwayat reservasi milik user ini (RLS otomatis membatasi)
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, reservation_code, reservation_date, start_time, guest_count, status')
    .order('reservation_date', { ascending: false })
    .limit(10)
  
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
              Dashboard Pelanggan
            </h1>
            <p style={{ color: '#6b7280' }}>
              Selamat datang, <strong>{profile.full_name}</strong>
            </p>
          </div>
          <LogoutButton />
        </div>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Riwayat Reservasi
        </h2>
        
        {reservations && reservations.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Kode</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Tanggal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Jam</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Tamu</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>API</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r, index) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: index < reservations.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {r.reservation_code}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{r.reservation_date}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{r.start_time}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{r.guest_count}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        background: '#f3f4f6',
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <a
                        href={`/api/reservations/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#3b82f6', fontSize: '0.875rem' }}
                      >
                        Lihat JSON
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: '#fffbeb',
            padding: '1.5rem',
            borderRadius: '8px',
            borderLeft: '4px solid #f59e0b',
          }}>
            <p style={{ color: '#374151', margin: 0 }}>
              Belum ada reservasi. Belum ada data untuk diuji.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
