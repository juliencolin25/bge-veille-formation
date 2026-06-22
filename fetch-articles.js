import 'dotenv/config';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const parser = new Parser();

const SOURCES = [
  // Formation professionnelle & CPF
  {
    name: 'Centre Inffo — Actualités formation',
    url: 'https://www.centre-inffo.fr/category/site-centre-inffo/actualites-centre-inffo/le-quotidien-de-la-formation-actualite-formation-professionnelle-apprentissage/feed',
  },
  {
    name: 'Centre Inffo — Droit de la formation',
    url: 'https://www.centre-inffo.fr/category/site-droit-formation/actualites-droit/feed',
  },
  {
    name: 'Ministère du Travail',
    url: 'https://travail-emploi.gouv.fr/rss.xml',
  },
  // Qualiopi & certification
  {
    name: 'Activ Cert — Qualiopi',
    url: 'https://activcert.fr/feed',
  },
  // Entrepreneuriat & création d'entreprise
  {
    name: 'Culture RH — Formation & Management',
    url: 'https://culture-rh.com/feed',
  },
];

// Filtre pour les sources généralistes : ne garder que les articles pertinents
const MOTS_CLES = [
  'formation', 'qualiopi', 'cpf', 'compte personnel de formation',
  'organisme de formation', 'certification', 'certif',
  'apprentissage', 'compétences', 'ofpca', 'dreets',
  'création d\'entreprise', 'entrepreneur', 'entrepreneuriat',
  'auto-entrepreneur', 'autoentrepreneur', 'micro-entreprise',
  'financement', 'accompagnement', 'porteur de projet',
  'travailleur indépendant', 'bge',
];

const SOURCES_GENERALISTES = ['Ministère du Travail', 'Culture RH — Formation & Management'];

function estPertinent(article) {
  const texte = `${article.titre} ${article.resume || ''}`.toLowerCase();
  return MOTS_CLES.some(mot => texte.includes(mot));
}

async function fetchAndStore() {
  let total = 0;
  let inseres = 0;
  let filtres = 0;

  for (const source of SOURCES) {
    console.log(`Fetching: ${source.name}`);
    try {
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items) {
        total++;
        const article = {
          titre: item.title?.trim() || '(sans titre)',
          lien: item.link,
          source: source.name,
          date_publication: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          resume: item.contentSnippet?.substring(0, 500) || item.summary?.substring(0, 500) || null,
        };

        if (SOURCES_GENERALISTES.includes(source.name) && !estPertinent(article)) {
          filtres++;
          continue;
        }

        const { error } = await supabase
          .from('articles')
          .insert(article)
          .select();

        if (error) {
          if (error.code === '23505') {
            // doublon, ignoré
          } else {
            console.error(`Erreur insert (${source.name}):`, error.message);
          }
        } else {
          inseres++;
        }
      }
    } catch (err) {
      console.error(`Erreur fetch (${source.name}):`, err.message);
    }
  }

  console.log(`Terminé : ${inseres} articles insérés, ${filtres} filtrés, ${total} récupérés.`);
}

fetchAndStore();
