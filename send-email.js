import 'dotenv/config';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const MAX_ARTICLES = 5;
const LOGO_URL = 'https://juliencolin25.github.io/bge-veille-formation/logo-bge.png';
const SITE_URL = 'https://juliencolin25.github.io/bge-veille-formation/';

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

async function countRecentArticles() {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .gte('date_ajout', since.toISOString());
  return count || 0;
}

function buildHtml(articles, totalDispo) {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const articlesHtml = articles.length === 0
    ? `<tr><td style="padding:20px;text-align:center;color:#93B0B6;font-family:Arial,sans-serif;">Aucun nouvel article cette semaine.</td></tr>`
    : articles.map((a, i) => {
        const date = a.date_publication
          ? new Date(a.date_publication).toLocaleDateString('fr-FR')
          : '';
        return `
          <tr>
            <td style="padding:0 0 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#ffffff;border-left:5px solid #004999;border-radius:3px;">
                <tr>
                  ${a.image_url ? `<td style="padding:14px 0 14px 14px;vertical-align:top;width:100px;">
                    <img src="${a.image_url}" width="90" style="display:block;border-radius:3px;object-fit:cover;" alt="">
                  </td>` : ''}
                  <td style="padding:14px 18px;">
                    <div style="font-family:Arial,sans-serif;font-size:10px;color:#009FE3;
                                font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;
                                margin-bottom:6px;">
                      ${String(i + 1).padStart(2, '0')} &nbsp;·&nbsp; ${a.source}${date ? ` &nbsp;·&nbsp; ${date}` : ''}
                    </div>
                    <a href="${a.lien}"
                       style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;
                              color:#004999;text-decoration:none;line-height:1.4;display:block;
                              margin-bottom:8px;">${a.titre}</a>
                    ${a.resume
                      ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#333;
                                   line-height:1.6;margin:0 0 10px 0;">${a.resume}</p>`
                      : ''}
                    <a href="${a.lien}"
                       style="font-family:Arial,sans-serif;font-size:11px;font-weight:bold;
                              color:#0072A7;text-decoration:none;">Lire l'article →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f6fb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6fb;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr>
        <td style="background:#ffffff;border-bottom:4px solid #45BCCF;
                   padding:20px 28px;border-radius:4px 4px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${LOGO_URL}" alt="BGE Franche-Comté" height="60"
                     style="display:block;border:0;" />
              </td>
              <td align="right" style="vertical-align:middle;">
                <div style="font-family:Arial,sans-serif;font-size:10px;color:#93B0B6;
                            text-transform:uppercase;letter-spacing:0.06em;text-align:right;">
                  Veille Formation<br>${dateStr}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BANDEAU TITRE -->
      <tr>
        <td style="background:#004999;padding:18px 28px;">
          <h1 style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;
                     color:#ffffff;margin:0 0 5px 0;text-transform:uppercase;
                     letter-spacing:0.04em;">TOP ${articles.length} ARTICLES DE LA SEMAINE</h1>
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#45BCCF;margin:0;">
            Formation professionnelle &nbsp;·&nbsp; CPF &nbsp;·&nbsp; Qualiopi &nbsp;·&nbsp; Entrepreneuriat
            ${totalDispo > MAX_ARTICLES
              ? ` &nbsp;·&nbsp; <strong style="color:#ffffff;">${totalDispo} articles disponibles sur le site</strong>`
              : ''}
          </p>
        </td>
      </tr>

      <!-- ARTICLES -->
      <tr>
        <td style="background:#f2f6fb;padding:20px 28px 8px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${articlesHtml}
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="background:#f2f6fb;padding:8px 28px 24px 28px;text-align:center;">
          <a href="${SITE_URL}"
             style="display:inline-block;background:#009FE3;color:#ffffff;
                    padding:11px 26px;border-radius:3px;font-family:Arial,sans-serif;
                    font-size:13px;font-weight:bold;text-decoration:none;
                    text-transform:uppercase;letter-spacing:0.04em;">
            Voir tous les articles →
          </a>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#004999;padding:14px 28px;text-align:center;
                   border-radius:0 0 4px 4px;">
          <p style="font-family:Arial,sans-serif;font-size:9px;color:#45BCCF;
                    text-transform:uppercase;letter-spacing:0.06em;margin:0;">
            BGE FRANCHE-COMTÉ &nbsp;·&nbsp; APPUI AUX ENTREPRENEURS &nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color:#45BCCF;text-decoration:none;">VEILLE EN LIGNE</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function main() {
  const [articles, totalDispo] = await Promise.all([
    fetchRecentArticles(),
    countRecentArticles(),
  ]);

  console.log(`${articles.length} articles sélectionnés sur ${totalDispo} disponibles.`);

  const html = buildHtml(articles, totalDispo);
  const to = process.env.EMAIL_TO || process.env.GMAIL_USER;

  await transporter.sendMail({
    from: `"Veille BGE Franche-Comté" <${process.env.GMAIL_USER}>`,
    to,
    subject: `VEILLE FORMATION BGE — Top ${articles.length} articles · ${new Date().toLocaleDateString('fr-FR')}`,
    html,
  });

  console.log(`Email envoyé à ${to}`);
}

main();
