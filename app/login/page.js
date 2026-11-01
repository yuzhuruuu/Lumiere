'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        padding: '0.75rem',
        background: pending ? '#9ca3af' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: pending ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {pending ? 'Masuk...' : 'Login'}
    </button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const searchParams = useSearchParams()
  const successMessage = searchParams.get('message')
  
  async function handleSubmit(formData) {
    setError(null)
    setFieldErrors({})
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      if (result.details) {
        setFieldErrors(result.details)
      }
    }
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}>
          Login
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: '1.5rem',
        }}>
          Lumière Bar & Resto
        </p>
        
        {successMessage && (
          <div style={{
            padding: '0.75rem',
            background: '#d1fae5',
            color: '#065f46',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            {successMessage}
          </div>
        )}
        
        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}
        
        <form action={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="nama@email.com"
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
              }}
            />
            {fieldErrors.email && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {fieldErrors.email[0]}
              </p>
            )}
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
              }}
            />
            {fieldErrors.password && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {fieldErrors.password[0]}
              </p>
            )}
          </div>
          
          <SubmitButton />
        </form>
        
        <p style={{
          textAlign: 'center',
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}>
          Belum punya akun?{' '}
          <Link href="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
