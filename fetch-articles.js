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
    name: 'Centre Inffo — Réforme',
    url: 'https://www.centre-inffo.fr/category/site-reforme/feed',
  },
  {
    name: 'Centre Inffo — Innovation formation',
    url: 'https://www.centre-inffo.fr/category/innovation-formation/feed',
  },
  {
    name: 'Via Compétences — Emploi & Formation',
    url: 'https://www.via-competences.fr/rss-actualites.xml',
  },
  {
    name: 'Pro Choisir Mon Métier — Formation',
    url: 'https://pro.choisirmonmetier-paysdelaloire.fr/feed',
  },
  // Qualiopi & certification
  {
    name: 'Activ Cert — Qualiopi & Certification',
    url: 'https://activcert.fr/feed',
  },
  // Entrepreneuriat & création d'entreprise
  {
    name: 'Création Entreprise',
    url: 'https://www.creation-entreprise.fr/feed',
  },
  {
    name: 'France Active',
    url: 'https://www.franceactive.org/feed',
  },
  // Digital learning & pédagogie
  {
    name: 'Digiformag — Formation digitale',
    url: 'https://www.digiformag.com/feed',
  },
  {
    name: 'Thot Cursus — Éducation & Formation',
    url: 'https://cursus.edu/feed',
  },
  {
    name: 'Sydologie — Innovation pédagogique',
    url: 'https://sydologie.com/feed',
  },
  {
    name: 'Le Café Pédagogique',
    url: 'https://www.cafepedagogique.net/feed',
  },
];

async function fetchAndStore() {
  let total = 0;
  let inseres = 0;

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

  console.log(`Terminé : ${inseres} nouveaux articles insérés sur ${total} récupérés.`);
}

fetchAndStore();
