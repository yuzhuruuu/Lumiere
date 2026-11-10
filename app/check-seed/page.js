// app/check-seed/page.js
// Halaman untuk verifikasi seed data sudah jalan atau belum

import { createClient } from '@/lib/supabase/server'

export default async function CheckSeedPage() {
  const supabase = await createClient()
  
  // Query count dari setiap tabel
  const checks = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('menu_categories').select('*', { count: 'exact', head: true }),
    supabase.from('menu_items').select('*', { count: 'exact', head: true }),
    supabase.from('dining_tables').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('reservation_items').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }),
  ])
  
  const [
    profilesResult,
    categoriesResult,
    menuItemsResult,
    tablesResult,
    reservationsResult,
    reservationItemsResult,
    ordersResult,
    invoicesResult,
    paymentsResult,
  ] = checks
  
  // Expected counts dari seed data
  const expected = {
    profiles: 31,
    menu_categories: 8,
    menu_items: 32,
    dining_tables: 20,
    reservations: 28,
    reservation_items: 84,
    orders: 20,
    invoices: 20,
    payments: 22,
  }
  
  const actual = {
    profiles: profilesResult.count || 0,
    menu_categories: categoriesResult.count || 0,
    menu_items: menuItemsResult.count || 0,
    dining_tables: tablesResult.count || 0,
    reservations: reservationsResult.count || 0,
    reservation_items: reservationItemsResult.count || 0,
    orders: ordersResult.count || 0,
    invoices: invoicesResult.count || 0,
    payments: paymentsResult.count || 0,
  }
  
  // Cek apakah ada error
  const errors = checks.filter(r => r.error).map(r => r.error)
  
  // Hitung total match
  const matches = Object.keys(expected).filter(
    key => actual[key] === expected[key]
  ).length
  
  const allMatch = matches === Object.keys(expected).length
  
  // Cek akun test
  const { data: testAccounts } = await supabase
    .from('profiles')
    .select('email, role')
    .in('email', [
      'admin@lumiere.test',
      'staf1@lumiere.test',
      'pelanggan01@lumiere.test'
    ])
    .order('role')
  
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: '600', 
        marginBottom: '0.5rem' 
      }}>
        ✅ Verifikasi Seed Data
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Cek apakah seed data sudah dijalankan di Supabase
      </p>
      
      {/* Status Keseluruhan */}
      <div style={{
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        background: allMatch ? '#d1fae5' : '#fef3c7',
        borderLeft: `4px solid ${allMatch ? '#10b981' : '#f59e0b'}`,
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem' 
        }}>
          {allMatch ? '✅ Seed Data Lengkap!' : '⚠️ Seed Data Belum Lengkap'}
        </h2>
        <p style={{ color: '#374151' }}>
          {allMatch 
            ? 'Semua tabel memiliki jumlah data sesuai seed. Siap untuk development!'
            : `${matches} dari ${Object.keys(expected).length} tabel sudah sesuai. Perlu dijalankan seed SQL di Supabase.`
          }
        </p>
      </div>
      
      {/* Tabel Perbandingan */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        marginBottom: '2rem',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600' 
              }}>
                Tabel
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'right', 
                fontWeight: '600' 
              }}>
                Expected
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'right', 
                fontWeight: '600' 
              }}>
                Actual
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'center', 
                fontWeight: '600' 
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(expected).map((tableName, index) => {
              const isMatch = actual[tableName] === expected[tableName]
              return (
                <tr 
                  key={tableName}
                  style={{ 
                    borderBottom: index < Object.keys(expected).length - 1 
                      ? '1px solid #f3f4f6' 
                      : 'none',
                    background: isMatch ? 'white' : '#fef3c7'
                  }}
                >
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                    {tableName}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right',
                    fontWeight: '500'
                  }}>
                    {expected[tableName]}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right',
                    fontWeight: '500',
                    color: isMatch ? '#10b981' : '#f59e0b'
                  }}>
                    {actual[tableName]}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {isMatch ? '✅' : '⚠️'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Akun Test */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '2rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '1rem' 
        }}>
          🔑 Akun Test
        </h2>
        
        {testAccounts && testAccounts.length > 0 ? (
          <>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Password semua akun: <code style={{ 
                background: '#f3f4f6', 
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>LumiereDemo#2026</code>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {testAccounts.map(account => (
                <div 
                  key={account.email}
                  style={{
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <code style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {account.email}
                  </code>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: account.role === 'admin' 
                      ? '#fce7f3' 
                      : account.role === 'staf' 
                      ? '#fef3c7' 
                      : '#dbeafe',
                    color: account.role === 'admin' 
                      ? '#be185d' 
                      : account.role === 'staf' 
                      ? '#92400e' 
                      : '#1e40af',
                  }}>
                    {account.role}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            padding: '1rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
          }}>
            ⚠️ Akun test tidak ditemukan. Seed belum dijalankan.
          </div>
        )}
      </div>
      
      {/* Error Handling */}
      {errors.length > 0 && (
        <div style={{
          background: '#fee2e2',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #dc2626',
          marginBottom: '2rem',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#991b1b'
          }}>
            ❌ Error
          </h2>
          {errors.map((error, index) => (
            <pre key={index} style={{
              background: '#fef2f2',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
              marginBottom: index < errors.length - 1 ? '0.5rem' : 0
            }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          ))}
        </div>
      )}
      
      {/* Instruksi */}
      {!allMatch && (
        <div style={{
          background: '#f0f9ff',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #0ea5e9',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1rem' 
          }}>
            📝 Cara Jalankan Seed
          </h2>
          <ol style={{ paddingLeft: '1.5rem', color: '#374151' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Buka <strong>Supabase Dashboard</strong> → SQL Editor
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Klik <strong>New Query</strong>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Copy paste isi file <code>seed_lumiere_bar_resto.sql</code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Klik <strong>Run</strong> atau tekan Ctrl+Enter
            </li>
            <li>
              Refresh halaman ini untuk cek ulang
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
