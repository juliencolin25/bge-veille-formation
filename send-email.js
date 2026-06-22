import 'dotenv/config';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function fetchRecentArticles() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .gte('date_ajout', since.toISOString())
    .order('date_publication', { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
}

function buildHtml(articles) {
  if (articles.length === 0) {
    return '<p>Aucun nouvel article cette semaine.</p>';
  }

  const bySource = articles.reduce((acc, a) => {
    acc[a.source] = acc[a.source] || [];
    acc[a.source].push(a);
    return acc;
  }, {});

  let html = `
    <h1 style="color:#1a3c6e;font-family:sans-serif;">Veille Formation — BGE Franche-Comté</h1>
    <p style="font-family:sans-serif;color:#555;">Semaine du ${new Date().toLocaleDateString('fr-FR')} — ${articles.length} nouveaux articles</p>
    <hr>
  `;

  for (const [source, items] of Object.entries(bySource)) {
    html += `<h2 style="color:#1a3c6e;font-family:sans-serif;">${source}</h2><ul style="font-family:sans-serif;">`;
    for (const a of items) {
      const date = a.date_publication
        ? new Date(a.date_publication).toLocaleDateString('fr-FR')
        : '';
      html += `
        <li style="margin-bottom:12px;">
          <a href="${a.lien}" style="color:#1a3c6e;font-weight:bold;">${a.titre}</a>
          ${date ? `<span style="color:#999;font-size:0.85em;"> — ${date}</span>` : ''}
          ${a.resume ? `<br><span style="color:#555;font-size:0.9em;">${a.resume}</span>` : ''}
        </li>
      `;
    }
    html += '</ul>';
  }

  html += `<hr><p style="font-family:sans-serif;font-size:0.8em;color:#999;">
    Historique complet : <a href="https://juliencolin25.github.io/bge-veille-formation/">juliencolin25.github.io/bge-veille-formation</a>
  </p>`;

  return html;
}

async function main() {
  const articles = await fetchRecentArticles();
  console.log(`${articles.length} articles récupérés pour la semaine.`);

  const html = buildHtml(articles);

  await transporter.sendMail({
    from: `"Veille BGE" <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: `Veille Formation BGE — ${articles.length} articles cette semaine`,
    html,
  });

  console.log('Email envoyé avec succès.');
}

main();
