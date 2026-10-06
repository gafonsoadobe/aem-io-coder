/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Agibank link normalization.
 * - Absolute links to agibank.com.br pages that are part of this migration become
 *   root-relative, so they point at the migrated pages instead of the old site.
 * - Paths that redirect on the source are rewritten to their final page.
 * Runs in afterTransform so links inside parsed blocks are covered too.
 */
const MIGRATED_PATHS = ["/","/about","/agi-mais","/agibank","/appdoagi","/asset","/beneficio-inss","/cartoes","/conta-corrente","/credito-do-trabalhador","/dicas-de-seguranca","/emprestimo","/emprestimo-consignado","/emprestimo-consignado-servidor-publico","/emprestimo-fgts","/emprestimo-pessoal","/en","/fale-conosco","/fale-conosco/app-e-acesso","/fale-conosco/atendimento-e-canais","/fale-conosco/boletos-e-pagamentos","/fale-conosco/cartoes","/fale-conosco/correspondentes-bancarios","/fale-conosco/emprestimos","/fale-conosco/pix-e-transferencias","/fale-conosco/seguranca","/imprensa","/muda-pro-agi","/open-finance","/ouvidoria","/pix","/politica-de-privacidade","/politicas","/politicas-de-privacidade","/portabilidade-emprestimo-consignado","/portabilidade-salario","/relatorios","/relatorios-financeiros","/relatorios-novo-desenrola-brasil-2026","/scr","/seguros","/sobre/premiacoes","/termos-de-uso"];

// redirects observed on the source site (HTTP 301/307)
const REDIRECTS = {
  '/sobre': '/agibank',
  '/premiacoes': '/sobre/premiacoes',
};

const SITE_HOSTS = ['agibank.com.br', 'www.agibank.com.br'];

export default function transform(hookName, element) {
  if (hookName !== 'afterTransform') return;
  element.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    let url;
    try {
      url = new URL(href, 'https://agibank.com.br/');
    } catch (e) {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || !SITE_HOSTS.includes(url.hostname)) return;
    const isRelative = !/^https?:/i.test(href);
    let path = url.pathname.replace(/\/$/, '') || '/';
    if (REDIRECTS[path]) path = REDIRECTS[path];
    if (!MIGRATED_PATHS.includes(path)) return;
    const next = `${path}${url.search}${url.hash}`;
    if (!isRelative || next !== href) a.setAttribute('href', next);
  });
}
