import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

interface Props {
  children: ReactNode
}

interface State {
  adaGalat: boolean
  pesanGalat: string
}

export class BatasGalat extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { adaGalat: false, pesanGalat: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { adaGalat: true, pesanGalat: error.message || 'Terjadi kesalahan sistem yang tidak terduga.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BatasGalat menangkap kesalahan:', error, info)
  }

  handleReset = () => {
    localStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.state.adaGalat) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: '#F8FAFC',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Icon name="peringatan" size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              Terjadi Kendala Memuat Tampilan
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
              {this.state.pesanGalat}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0C2340',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Reset Sesi &amp; Cache
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
