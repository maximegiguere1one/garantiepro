// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { compression } from "file:///home/project/node_modules/vite-plugin-compression2/dist/index.mjs";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [
    react(),
    compression({
      algorithm: "gzip",
      threshold: 1024,
      deleteOriginalAssets: false
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 1024,
      deleteOriginalAssets: false
    })
  ],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "date-fns",
      "lucide-react"
    ],
    exclude: ["jspdf", "jspdf-autotable"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (id.includes("react-router-dom")) {
              return "vendor-router";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("@stripe")) {
              return "vendor-stripe";
            }
            if (id.includes("jspdf") || id.includes("html2canvas")) {
              return "vendor-pdf";
            }
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("zod") || id.includes("signature_pad") || id.includes("qrcode")) {
              return "vendor-utils";
            }
            if (id.includes("xlsx") || id.includes("shepherd")) {
              return "vendor-excel-tour";
            }
            if (id.includes("pdf-lib")) {
              return "vendor-pdf-lib";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            return "vendor-other";
          }
          if (id.includes("src/components")) {
            if (id.includes("Dashboard") || id.includes("Login") || id.includes("Franchisee")) {
              return "core-components";
            }
            if (id.includes("Admin") || id.includes("Billing") || id.includes("Analytics")) {
              return "admin-components";
            }
            if (id.includes("Warranty") || id.includes("Claim")) {
              return "warranty-components";
            }
            if (id.includes("Organizations") || id.includes("Settings")) {
              return "settings-components";
            }
            if (id.includes("Customer") || id.includes("Dealer")) {
              return "business-components";
            }
            return "common-components";
          }
        }
      }
    },
    chunkSizeWarningLimit: 1e3,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
        pure_funcs: []
      },
      format: {
        comments: false
      }
    },
    target: "es2020",
    cssCodeSplit: true,
    reportCompressedSize: false,
    assetsInlineLimit: 4096
  },
  server: {
    hmr: {
      overlay: false
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBjb21wcmVzc2lvbiB9IGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uMic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6ICcvJyxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgY29tcHJlc3Npb24oe1xuICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXG4gICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICBkZWxldGVPcmlnaW5hbEFzc2V0czogZmFsc2UsXG4gICAgfSksXG4gICAgY29tcHJlc3Npb24oe1xuICAgICAgYWxnb3JpdGhtOiAnYnJvdGxpQ29tcHJlc3MnLFxuICAgICAgdGhyZXNob2xkOiAxMDI0LFxuICAgICAgZGVsZXRlT3JpZ2luYWxBc3NldHM6IGZhbHNlLFxuICAgIH0pLFxuICBdLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgICdkYXRlLWZucycsXG4gICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICBdLFxuICAgIGV4Y2x1ZGU6IFsnanNwZGYnLCAnanNwZGYtYXV0b3RhYmxlJ10sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdCcpIHx8IGlkLmluY2x1ZGVzKCdyZWFjdC1kb20nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlci1kb20nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yb3V0ZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAc3VwYWJhc2UnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1zdXBhYmFzZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzdHJpcGUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1zdHJpcGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdqc3BkZicpIHx8IGlkLmluY2x1ZGVzKCdodG1sMmNhbnZhcycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXBkZic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2RhdGUtZm5zJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZGF0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWljb25zJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnem9kJykgfHwgaWQuaW5jbHVkZXMoJ3NpZ25hdHVyZV9wYWQnKSB8fCBpZC5pbmNsdWRlcygncXJjb2RlJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItdXRpbHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd4bHN4JykgfHwgaWQuaW5jbHVkZXMoJ3NoZXBoZXJkJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZXhjZWwtdG91cic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3BkZi1saWInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1wZGYtbGliJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHRhbnN0YWNrJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItcXVlcnknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3Itb3RoZXInO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3JjL2NvbXBvbmVudHMnKSkge1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdEYXNoYm9hcmQnKSB8fCBpZC5pbmNsdWRlcygnTG9naW4nKSB8fCBpZC5pbmNsdWRlcygnRnJhbmNoaXNlZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnY29yZS1jb21wb25lbnRzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQWRtaW4nKSB8fCBpZC5pbmNsdWRlcygnQmlsbGluZycpIHx8IGlkLmluY2x1ZGVzKCdBbmFseXRpY3MnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2FkbWluLWNvbXBvbmVudHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdXYXJyYW50eScpIHx8IGlkLmluY2x1ZGVzKCdDbGFpbScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnd2FycmFudHktY29tcG9uZW50cyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ09yZ2FuaXphdGlvbnMnKSB8fCBpZC5pbmNsdWRlcygnU2V0dGluZ3MnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3NldHRpbmdzLWNvbXBvbmVudHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdDdXN0b21lcicpIHx8IGlkLmluY2x1ZGVzKCdEZWFsZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2J1c2luZXNzLWNvbXBvbmVudHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdjb21tb24tY29tcG9uZW50cyc7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiBmYWxzZSxcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogZmFsc2UsXG4gICAgICAgIHB1cmVfZnVuY3M6IFtdLFxuICAgICAgfSxcbiAgICAgIGZvcm1hdDoge1xuICAgICAgICBjb21tZW50czogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBobXI6IHtcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsbUJBQW1CO0FBRTVCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxNQUNWLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxNQUNYLHNCQUFzQjtBQUFBLElBQ3hCLENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxNQUNWLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxNQUNYLHNCQUFzQjtBQUFBLElBQ3hCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLFNBQVMsaUJBQWlCO0FBQUEsRUFDdEM7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWMsQ0FBQyxPQUFPO0FBQ3BCLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDcEQscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLGtCQUFrQixHQUFHO0FBQ25DLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDNUIscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFNBQVMsR0FBRztBQUMxQixxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxhQUFhLEdBQUc7QUFDdEQscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzQixxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxLQUFLLEtBQUssR0FBRyxTQUFTLGVBQWUsS0FBSyxHQUFHLFNBQVMsUUFBUSxHQUFHO0FBQy9FLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxNQUFNLEtBQUssR0FBRyxTQUFTLFVBQVUsR0FBRztBQUNsRCxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsU0FBUyxHQUFHO0FBQzFCLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDNUIscUJBQU87QUFBQSxZQUNUO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsZ0JBQWdCLEdBQUc7QUFDakMsZ0JBQUksR0FBRyxTQUFTLFdBQVcsS0FBSyxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxZQUFZLEdBQUc7QUFDakYscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsU0FBUyxLQUFLLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDOUUscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFVBQVUsS0FBSyxHQUFHLFNBQVMsT0FBTyxHQUFHO0FBQ25ELHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxlQUFlLEtBQUssR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzRCxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSxHQUFHLFNBQVMsVUFBVSxLQUFLLEdBQUcsU0FBUyxRQUFRLEdBQUc7QUFDcEQscUJBQU87QUFBQSxZQUNUO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxJQUN2QixXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxlQUFlO0FBQUEsUUFDZixZQUFZLENBQUM7QUFBQSxNQUNmO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLGNBQWM7QUFBQSxJQUNkLHNCQUFzQjtBQUFBLElBQ3RCLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
