const OFFICIAL = 'https://mapafasc.saocristovao.se.gov.br/';

export function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__inner">
        <p className="site-footer__brand">
          <strong>CRICRI</strong>
          <span>App independente da comunidade</span>
        </p>
        <p className="site-footer__note">
          Este aplicativo foi desenvolvido de modo <strong>independente</strong> e não substitui os
          canais oficiais do Festival de Artes de São Cristóvão.
        </p>
        <p className="site-footer__official">
          Site oficial do evento:{' '}
          <a href={OFFICIAL} target="_blank" rel="noopener noreferrer">
            mapafasc.saocristovao.se.gov.br
          </a>
        </p>
        <p className="site-footer__dev">
          Desenvolvido por <strong>AcidMisterY</strong>
        </p>
      </div>
    </footer>
  );
}
