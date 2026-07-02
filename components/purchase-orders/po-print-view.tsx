'use client'

import { useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/format'
import type { CompanySettings } from '@/types'

interface POItem {
  id: string
  quantity: number
  cost: number
  products: { id: string; name: string; master_sku: string; unit?: string | null }
}

interface POData {
  id: string
  po_number?: string
  expected_date: string
  created_at: string
  status: string
  notes?: string
  approved_by?: string
  requisitioner?: string
  shipped_via?: string
  fob_point?: string
  payment_terms?: string
  ship_to_name?: string
  ship_to_address?: string
  vat_rate?: number
  shipping_fee?: number
  suppliers: {
    supplier_name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  }
  purchase_order_items: POItem[]
}

function formatDateDMY(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const cell: React.CSSProperties = { padding: '6px 10px' }
const headerCell: React.CSSProperties = { ...cell, textAlign: 'left' as const }

export function POPrintView({ po, company }: { po: POData; company: CompanySettings | null }) {
  useEffect(() => { window.print() }, [])

  const subtotal    = po.purchase_order_items.reduce((s, i) => s + i.quantity * i.cost, 0)
  const vatRate     = po.vat_rate ?? 0
  const vatAmount   = subtotal * vatRate / 100
  const shippingFee = po.shipping_fee ?? 0
  const total       = subtotal + vatAmount + shippingFee
  const poNumber  = po.po_number ?? `PO-${po.id.slice(-6).toUpperCase()}`
  const companyFullAddress = [company?.address, company?.city].filter(Boolean).join(', ')
  const shipToName    = po.ship_to_name    ?? company?.company_name ?? ''
  const shipToAddress = po.ship_to_address ?? companyFullAddress

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 14mm; }
        table { width: 100%; border-collapse: collapse; }
        .bg-black { background: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .bg-dark  { background: #555 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .text-white { color: #fff !important; }
        @media print {
          @page { size: A4; margin: 0; }
          .page { padding: 12mm 10mm; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="no-print" style={{ position:'fixed', top:16, right:16, display:'flex', gap:8, zIndex:50 }}>
        <button onClick={() => window.print()}
          style={{ padding:'8px 20px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 }}>
          🖨 Print
        </button>
        <button onClick={() => window.close()}
          style={{ padding:'8px 16px', background:'#e5e7eb', color:'#111', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 }}>
          Close
        </button>
      </div>

      <div className="page">
        {/* ── Header ── */}
        <table style={{ marginBottom:20 }}>
          <tbody><tr>
            <td style={{ width:'55%', verticalAlign:'top' }}>
              <div style={{ fontSize:30, fontWeight:900, letterSpacing:-1, lineHeight:1 }}>PURCHASE ORDER</div>
            </td>
            <td style={{ textAlign:'right', verticalAlign:'top', lineHeight:1.7 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{company?.company_name ?? 'Company Name'}</div>
              {company?.slogan && <div style={{ fontStyle:'italic', color:'#555', fontSize:11 }}>{company.slogan}</div>}
              {companyFullAddress && <div>{companyFullAddress}</div>}
              {company?.phone && <div><strong>Phone:</strong> {company.phone}</div>}
              {company?.email && <div><strong>Email:</strong> {company.email}</div>}
              {company?.tax_id && <div><strong>Tax ID:</strong> {company.tax_id}</div>}
            </td>
          </tr></tbody>
        </table>

        {/* ── TO / SHIP TO / PO NUMBER ── */}
        <table style={{ border:'1px solid #000', marginBottom:10 }}>
          <thead>
            <tr style={{ background:'#000', color:'#fff' }}>
              <th style={{ ...headerCell, width:'35%' }}>TO</th>
              <th style={{ ...headerCell, width:'35%', borderLeft:'1px solid #444' }}>SHIP TO</th>
              <th style={{ ...headerCell, width:'30%', borderLeft:'1px solid #444' }}>P.O NUMBER</th>
            </tr>
          </thead>
          <tbody><tr>
            <td style={{ padding:'10px', verticalAlign:'top', borderRight:'1px solid #ccc', lineHeight:1.8 }}>
              <div style={{ fontWeight:700 }}>{po.suppliers.supplier_name}</div>
              {po.suppliers.address && <div>{po.suppliers.address}</div>}
              {po.suppliers.phone   && <div><strong>Phone:</strong> {po.suppliers.phone}</div>}
              {po.suppliers.email   && <div><strong>Email:</strong> {po.suppliers.email}</div>}
            </td>
            <td style={{ padding:'10px', verticalAlign:'top', borderRight:'1px solid #ccc', lineHeight:1.8 }}>
              {shipToName    && <div style={{ fontWeight:700 }}>{shipToName}</div>}
              {shipToAddress && <div>{shipToAddress}</div>}
              {company?.phone && <div><strong>Phone:</strong> {company.phone}</div>}
              {company?.email && <div><strong>Email:</strong> {company.email}</div>}
            </td>
            <td style={{ padding:'10px', verticalAlign:'top', lineHeight:1.8 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{poNumber}</div>
              <div style={{ color:'#555', fontSize:10, marginTop:4 }}>
                The P.O. number must appear on all related correspondence, shipping papers, and invoices.
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── Meta row ── */}
        <table style={{ border:'1px solid #000', marginBottom:14 }}>
          <thead>
            <tr style={{ background:'#555', color:'#fff' }}>
              {['P.O Date','Requisitioner','Shipped Via','F.O.B Point','Terms','Expected Date'].map(h => (
                <th key={h} style={{ padding:'5px 8px', textAlign:'center', borderRight:'1px solid #777', fontSize:10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody><tr>
            {[
              formatDateDMY(po.created_at),
              po.requisitioner   || '—',
              po.shipped_via     || '—',
              po.fob_point       || '—',
              po.payment_terms   || '—',
              formatDateDMY(po.expected_date),
            ].map((v, i) => (
              <td key={i} style={{ padding:'6px 8px', textAlign:'center', borderRight:'1px solid #ccc', fontSize:11 }}>{v}</td>
            ))}
          </tr></tbody>
        </table>

        {/* ── Items ── */}
        <table style={{ borderCollapse:'collapse', width:'100%', marginBottom:14, border:'1px solid #000' }}>
          <thead>
            <tr style={{ background:'#555', color:'#fff' }}>
              <th style={{ width:'8%',  padding:'6px 8px', textAlign:'center', border:'1px solid #777' }}>Qty</th>
              <th style={{ width:'10%', padding:'6px 8px', textAlign:'center', border:'1px solid #777' }}>Unit</th>
              <th style={{              padding:'6px 8px', textAlign:'left',   border:'1px solid #777' }}>Description</th>
              <th style={{ width:'18%', padding:'6px 8px', textAlign:'right',  border:'1px solid #777' }}>Unit Price</th>
              <th style={{ width:'18%', padding:'6px 8px', textAlign:'right',  border:'1px solid #777' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {po.purchase_order_items.map((item, i) => (
              <tr key={item.id} style={{ background: i%2===1 ? '#fafafa' : '#fff' }}>
                <td style={{ padding:'7px 8px', textAlign:'center', border:'1px solid #ccc' }}>{item.quantity}</td>
                <td style={{ padding:'7px 8px', textAlign:'center', border:'1px solid #ccc', color:'#555' }}>
                  {item.products.unit ?? 'pcs'}
                </td>
                <td style={{ padding:'7px 8px', border:'1px solid #ccc' }}>
                  <div style={{ fontWeight:600 }}>{item.products.name}</div>
                  <div style={{ color:'#888', fontSize:10 }}>SKU: {item.products.master_sku}</div>
                </td>
                <td style={{ padding:'7px 8px', textAlign:'right', border:'1px solid #ccc' }}>{formatCurrency(item.cost)}</td>
                <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:600, border:'1px solid #ccc' }}>{formatCurrency(item.quantity * item.cost)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 7 - po.purchase_order_items.length) }).map((_, i) => (
              <tr key={`e${i}`}>
                {[0,1,2,3,4].map(j => (
                  <td key={j} style={{ padding:'7px 8px', border:'1px solid #ccc', height:28 }}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Footer ── */}
        <table style={{ marginBottom:28 }}>
          <tbody><tr>
            <td style={{ width:'55%', verticalAlign:'top', paddingRight:20 }}>
              <div style={{ fontSize:11, lineHeight:1.9 }}>
                <ul style={{ paddingLeft:16 }}>
                  <li>Please send two copies of your invoice.</li>
                  <li>Enter this order in accordance with the prices, terms, delivery method, and specifications listed above.</li>
                  <li>Please notify us immediately if you are unable to ship as specified.</li>
                  <li>Send all correspondence to:</li>
                </ul>
                <div style={{ marginTop:8, paddingLeft:16, lineHeight:2 }}>
                  {company?.company_name && <div style={{ fontWeight:600 }}>{company.company_name}</div>}
                  {companyFullAddress   && <div>{companyFullAddress}</div>}
                  {company?.phone       && <div>{company.phone}</div>}
                  {company?.email       && <div>{company.email}</div>}
                </div>
                {po.notes && (
                  <div style={{ marginTop:12, padding:'8px 10px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:4 }}>
                    <strong>Notes:</strong> {po.notes}
                  </div>
                )}
              </div>
            </td>
            <td style={{ verticalAlign:'top' }}>
              <table style={{ width:'100%', border:'1px solid #ccc' }}>
                <tbody>
                  {[
                    { label: 'Sub Total',                                          value: formatCurrency(subtotal) },
                    { label: `VAT (${vatRate}%)`,       value: vatRate > 0 ? formatCurrency(vatAmount) : '—' },
                    { label: 'Shipping & Handling',    value: shippingFee > 0 ? formatCurrency(shippingFee) : '—' },
                    { label: 'Other',                  value: '—' },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom:'1px solid #e5e7eb' }}>
                      <td style={{ padding:'5px 10px', borderRight:'1px solid #e5e7eb', fontWeight:500 }}>{row.label}</td>
                      <td style={{ padding:'5px 10px', textAlign:'right', minWidth:90 }}>{row.value}</td>
                    </tr>
                  ))}
                  <tr style={{ background:'#000', color:'#fff' }}>
                    <td style={{ padding:'6px 10px', fontWeight:700, borderRight:'1px solid #444' }}>Total</td>
                    <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:700 }}>{formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr></tbody>
        </table>

        {/* ── Signature ── */}
        <table>
          <tbody><tr>
            <td style={{ width:'50%', paddingRight:32 }}>
              <div style={{ borderTop:'2px solid #000', paddingTop:6, marginTop:20 }}>
                <span style={{ fontSize:11 }}>Authorized by: {po.approved_by ?? '______________________'}</span>
              </div>
            </td>
            <td style={{ width:'25%', paddingRight:16 }}>
              <div style={{ borderTop:'2px solid #000', paddingTop:6, marginTop:20 }}>
                <span style={{ fontSize:11 }}>Date: {formatDateDMY(po.created_at)}</span>
              </div>
            </td>
            <td style={{ width:'25%' }}>
              <div style={{ borderTop:'2px solid #000', paddingTop:6, marginTop:20 }}>
                <span style={{ fontSize:11 }}>Signature</span>
              </div>
            </td>
          </tr></tbody>
        </table>
      </div>
    </>
  )
}
