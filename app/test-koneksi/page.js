// app/test-koneksi/page.js
// Halaman test koneksi ke Supabase
// Membaca tabel menu_categories untuk verifikasi koneksi database

import { createClient } from '@/lib/supabase/server'

export default async function TestKoneksiPage() {
  const supabase = await createClient()
  
  // Test koneksi dengan membaca tabel menu_categories
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
  
  if (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Koneksi Gagal</h1>
        <p style={{ color: 'red', marginTop: '1rem' }}>
          Error: {error.message}
        </p>
        <details style={{ marginTop: '1rem' }}>
          <summary>Detail Error</summary>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto' 
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </main>
    )
  }
  
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Terhubung ke Supabase</h1>
      
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1rem', 
        background: '#f0f9ff',
        borderLeft: '4px solid #0ea5e9',
        borderRadius: '4px'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Tabel:</strong> menu_categories
        </p>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          <strong>Jumlah baris:</strong> {data.length}
        </p>
      </div>
      
      {data.length === 0 ? (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#fffbeb',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>
            Belum ada data di tabel menu_categories. Ini normal untuk database baru.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Data Kategori Menu:
          </h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.map((category) => (
              <li 
                key={category.id}
                style={{ 
                  padding: '0.75rem', 
                  background: '#f9fafb',
                  marginBottom: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <strong>{category.name}</strong>
                {category.sort_order !== undefined && (
                  <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                    (urutan: {category.sort_order})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ 
        marginTop: '2rem', 
        paddingTop: '1rem', 
        borderTop: '1px solid #e5e7eb',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        <p>
          Koneksi Supabase berhasil! Server Component dapat membaca database.
        </p>
      </div>
    </main>
  )
}
