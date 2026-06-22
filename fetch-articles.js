import 'dotenv/config';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const parser = new Parser();

const SOURCES = [
  {
    name: 'Centre Inffo',
    url: 'https://www.centre-inffo.fr/site-centre-inffo/rubrique-centre-inffo/actualites/rss.xml',
  },
  {
    name: 'France Compétences',
    url: 'https://www.francecompetences.fr/feed/',
  },
  {
    name: 'Légifrance - Formation professionnelle',
    url: 'https://www.legifrance.gouv.fr/api/rss/rss_profession_formation.xml',
  },
  {
    name: 'Ministère du Travail',
    url: 'https://travail-emploi.gouv.fr/rss.xml',
  },
];

async function fetchAndStore() {
  let total = 0;
  let inserted = 0;

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
            // duplicate lien, skip silently
          } else {
            console.error(`Erreur insert (${source.name}):`, error.message);
          }
        } else {
          inserted++;
        }
      }
    } catch (err) {
      console.error(`Erreur fetch (${source.name}):`, err.message);
    }
  }

  console.log(`Terminé : ${inserted} nouveaux articles insérés sur ${total} récupérés.`);
}

fetchAndStore();
