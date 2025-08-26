/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          // Professional poker theme
          primary: '#1B4D3E',      // Deep green
          secondary: '#D4AF37',    // Gold
          felt: '#0A2A1F',         // Darker felt green
          green: '#1B4D3E',        // Primary green
          'green-light': '#2D5A47', // Lighter green
          'green-dark': '#0E3A2A',  // Darker green
          
          // Accent colors
          blue: '#2E5BBA',         // Action blue
          red: '#C62828',          // Warning/loss red
          win: '#388E3C',          // Win green
          gold: '#D4AF37',         // Gold accent
          
          // Background colors
          bg: {
            dark: '#1E1E1E',       // Main dark background
            card: '#2D2D2D',       // Card background
            elevated: '#3A3A3A',   // Elevated surfaces
            overlay: 'rgba(0, 0, 0, 0.8)', // Modal overlay
          },
          
          // Text colors
          text: {
            primary: '#FFFFFF',     // Primary text
            secondary: '#B0B0B0',   // Secondary text
            accent: '#D4AF37',      // Accent text
            muted: '#6B7280',       // Muted text
          },
          
          // Border colors
          border: {
            default: '#404040',     // Default border
            light: '#525252',       // Light border
            accent: '#D4AF37',      // Accent border
          }
        },
        // Training system colors
        training: {
          // Training states
          active: '#10B981',       // Training in progress - emerald
          pause: '#F59E0B',        // Paused - amber
          complete: '#8B5CF6',     // Complete - violet
          error: '#EF4444',        // Error - red
          waiting: '#6B7280',      // Waiting - gray
          
          // Action colors  
          action: {
            fold: '#6B7280',       // Fold - neutral gray
            call: '#10B981',       // Call - green
            raise: '#EF4444',      // Raise - red
            check: '#3B82F6',      // Check - blue
            'all-in': '#8B5CF6',   // All-in - violet
          },
          
          // Control colors
          control: {
            replay: '#8B5CF6',     // Replay - violet
            next: '#F59E0B',       // Next hand - amber
            analyze: '#06B6D4',    // Analyze - cyan
            save: '#10B981',       // Save - green
          },
          
          // Information colors
          info: {
            success: '#10B981',    // Success
            warning: '#F59E0B',    // Warning
            danger: '#EF4444',     // Danger
            primary: '#3B82F6',    // Primary info
          }
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        'replay': '320px 1fr 360px', // Sidebar, main, analysis
        'replay-mobile': '1fr',       // Mobile single column
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'poker': '0 4px 20px rgba(27, 77, 62, 0.3)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'elevated': '0 8px 25px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}