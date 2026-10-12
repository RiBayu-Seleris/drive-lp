import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown, Minus } from 'lucide-react';
import { faqItems, productRoles, servicePaths } from '../content/product';
import { DRIVE_LINKS } from '../lib/links';

export function ProductContent({ reduced, onExplore }: { reduced: boolean; onExplore: () => void }) {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  return <>
    <section id="services" className="product-paths section-shell" aria-labelledby="services-title">
      <div className="product-intro" data-aos="fade-up">
        <p className="eyebrow">DARI INSIDEN HINGGA PERBAIKAN</p>
        <h2 id="services-title">Langkah demi langkah.<br /><span>Kembali melaju.</span></h2>
        <p>Dari identitas kendaraan dan foto kerusakan, DRIVE menghubungkan hasil penilaian, klaim, dan layanan perbaikan Anda.</p>
      </div>
      <div className="service-paths">
        {servicePaths.map(path => <article className="service-path" key={path.id} data-aos="fade-up">
          <div className="path-heading"><span className="path-number mono">{path.number}</span><p className="eyebrow">{path.label}</p></div>
          <h3>{path.title}</h3><p>{path.description}</p>
          <ol>{path.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="path-note">{path.note}</p>
          {path.href && <a className="text-link" href={path.href}>{path.action}<ArrowUpRight size={14} /></a>}
        </article>)}
      </div>
    </section>
    <section id="roles" className="product-roles section-shell" aria-labelledby="roles-title">
      <div className="product-intro" data-aos="fade-up"><p className="eyebrow">MENDAMPINGI PERJALANAN ANDA</p><h2 id="roles-title">Bantuan terhubung.<br /><span>Kendaraan tertangani.</span></h2><p>DRIVE menghubungkan Anda dengan asuransi, mitra towing, sopir, dan bengkel yang menangani kendaraan.</p>
        {DRIVE_LINKS.partner && <a className="text-link" href={DRIVE_LINKS.partner}>Daftar sebagai mitra<ArrowUpRight size={14} /></a>}
      </div>
      <div className="role-list">{productRoles.map((role, index) => <article key={role.title} data-aos="fade-up"><span className="mono">0{index + 1}</span><div><h3>{role.title}</h3><p>{role.detail}</p></div></article>)}</div>
    </section>
    <section id="perspective" className="perspective section-shell" aria-labelledby="perspective-title">
      <div className="perspective-copy" data-aos="fade-up"><p className="eyebrow">MULAI DENGAN DRIVE</p><h2 id="perspective-title">Kembali ke jalan.<br /><span>Lanjutkan perjalanan.</span></h2><p>Saat insiden terjadi, mulai dari data kendaraan dan foto kerusakan. Ikuti langkahnya hingga kendaraan selesai diperbaiki.</p>
        {DRIVE_LINKS.scan ? <a className="button button--primary" href={DRIVE_LINKS.scan}>Mulai pemeriksaan<ArrowUpRight size={16} /></a> : <button className="button button--primary" onClick={onExplore}>Lihat cara kerja<ArrowUpRight size={16} /></button>}
        {DRIVE_LINKS.login && <a className="partner-link" href={DRIVE_LINKS.login}>Sudah punya akun? Masuk<ArrowUpRight size={12} /></a>}
      </div>
      <div className="faq-list" data-aos="fade-up"><p className="eyebrow faq-eyebrow">YANG PERLU DIKETAHUI</p>{faqItems.map((item, index) => <article className={`faq-item ${faqOpen === index ? 'is-open' : ''}`} key={item.question}>
        <h3><button aria-expanded={faqOpen === index} aria-controls={`faq-${index}`} onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span>{item.question}</span>{faqOpen === index ? <Minus size={16} /> : <ChevronDown size={16} />}</button></h3>
        <AnimatePresence initial={false}>{faqOpen === index && <motion.div id={`faq-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}><p>{item.answer}</p></motion.div>}</AnimatePresence>
      </article>)}</div>
    </section>
  </>;
}
