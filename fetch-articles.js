import 'dotenv/config';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const parser = new Parser();

const SOURCES = [
  // Formation professionnelle & Qualiopi
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
  {
    name: 'FFP - Fédération de la Formation Professionnelle',
    url: 'https://www.ffp.org/?format=feed&type=rss',
  },
  // CPF
  {
    name: 'Mon Compte Formation - Actualités',
    url: 'https://www.moncompteformation.gouv.fr/espace-prive/html/#/rss',
  },
  // Création d'entreprise & entrepreneuriat
  {
    name: 'BPI France Création',
    url: 'https://bpifrance-creation.fr/feeds/actualites',
  },
  {
    name: "L'Auto-Entrepreneur",
    url: 'https://www.lautoentrepreneur.fr/feed',
  },
  {
    name: 'Les Echos Entrepreneurs',
    url: 'https://business.lesechos.fr/entrepreneurs/rss',
  },
];

// Mots-clés : un article doit contenir au moins un de ces termes pour être conservé
const MOTS_CLES = [
  'formation', 'qualiopi', 'cpf', 'compte personnel de formation',
  'organisme de formation', 'ofpca', 'certif', 'certification',
  'création d\'entreprise', 'entrepreneur', 'entrepreneuriat',
  'auto-entrepreneur', 'autoentrepreneur', 'micro-entreprise',
  'financement', 'accompagnement', 'porteur de projet',
  'bge', 'travailleur indépendant', 'compétences',
];

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

        // Pour les sources généralistes, filtrer par mots-clés
        const sourcesGeneralistes = ['Ministère du Travail', 'Les Echos Entrepreneurs'];
        if (sourcesGeneralistes.includes(source.name) && !estPertinent(article)) {
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

  console.log(`Terminé : ${inseres} nouveaux articles insérés, ${filtres} filtrés, ${total} récupérés au total.`);
}

fetchAndStore();
