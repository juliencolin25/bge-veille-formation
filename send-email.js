import 'dotenv/config';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const MAX_ARTICLES = 5;

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
    .order('date_publication', { ascending: false })
    .limit(MAX_ARTICLES);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
}

function buildHtml(articles, totalDispo) {
  if (articles.length === 0) {
    return '<p>Aucun nouvel article cette semaine.</p>';
  }

  let html = `
    <h1 style="color:#1a3c6e;font-family:sans-serif;">Veille Formation — BGE Franche-Comté</h1>
    <p style="font-family:sans-serif;color:#555;">
      Semaine du ${new Date().toLocaleDateString('fr-FR')} —
      Top ${articles.length} articles
      ${totalDispo > MAX_ARTICLES ? ` (${totalDispo} disponibles au total)` : ''}
    </p>
    <hr>
    <ul style="font-family:sans-serif;padding-left:0;list-style:none;">
  `;

  for (const a of articles) {
    const date = a.date_publication
      ? new Date(a.date_publication).toLocaleDateString('fr-FR')
      : '';
    html += `
      <li style="margin-bottom:20px;border-left:3px solid #1a3c6e;padding-left:12px;">
        <a href="${a.lien}" style="color:#1a3c6e;font-weight:bold;font-size:1rem;">${a.titre}</a>
        <div style="font-size:0.8em;color:#888;margin:3px 0;">
          ${a.source}${date ? ` — ${date}` : ''}
        </div>
        ${a.resume ? `<div style="color:#555;font-size:0.9em;">${a.resume}</div>` : ''}
      </li>
    `;
  }

  html += `</ul><hr><p style="font-family:sans-serif;font-size:0.8em;color:#999;">
    Tous les articles : <a href="https://juliencolin25.github.io/bge-veille-formation/">juliencolin25.github.io/bge-veille-formation</a>
  </p>`;

  return html;
}

async function main() {
  // Compter le total disponible cette semaine
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .gte('date_ajout', since.toISOString());

  const articles = await fetchRecentArticles();
  console.log(`${articles.length} articles sélectionnés sur ${count} disponibles cette semaine.`);

  const html = buildHtml(articles, count);

  await transporter.sendMail({
    from: `"Veille BGE" <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: `Veille Formation BGE — Top ${articles.length} articles de la semaine`,
    html,
  });

  console.log('Email envoyé avec succès.');
}

main();
