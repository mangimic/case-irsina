import type { Sprache } from './sprachen.ts';

/**
 * Inhalte der beiden Rechtsseiten.
 *
 * ANSCHRIFT ist bewusst ein Platzhalter: eine Anbieterkennzeichnung braucht
 * eine ladungsfaehige Anschrift, und die kann nur der Betreiber selbst
 * einsetzen. Solange dort ANSCHRIFT_FEHLT steht, bricht der Datencheck den
 * Build mit einer Warnung ab, sobald die Seite auf die echte Domain zeigt.
 */
export const ANSCHRIFT = 'ANSCHRIFT_FEHLT';

export interface Abschnitt {
  h: string;
  p: string[];
}

export interface Rechtstext {
  titel: string;
  beschreibung: string;
  stand: string;
  abschnitte: Abschnitt[];
}

const STAND = '2026-08';

export const IMPRESSUM: Record<Sprache, Rechtstext> = {
  it: {
    titel: 'Note legali',
    beschreibung: 'Titolare del sito, contatti e limiti di responsabilità.',
    stand: STAND,
    abschnitte: [
      { h: 'Titolare del sito', p: [
        'Questo sito è un\'iniziativa privata, senza scopo di lucro e senza alcuna forma di intermediazione immobiliare.',
      ]},
      { h: 'Natura del servizio', p: [
        'Questo sito non è un\'agenzia immobiliare, non svolge attività di mediazione ai sensi della legge 39/1989 e non percepisce alcuna provvigione.',
        'Le informazioni pubblicate derivano da cartelli VENDESI e AFFITTASI affissi in luogo pubblico nel centro storico di Irsina e sono riportate senza garanzia di correttezza, attualità, disponibilità o prezzo.',
        'Ogni trattativa avviene direttamente e unicamente tra le parti interessate.',
      ]},
      { h: 'Segnalazioni e rimozioni', p: [
        'Se siete proprietari di un immobile qui indicato e desiderate una correzione, un aggiornamento o la rimozione della scheda, è sufficiente scrivere all\'indirizzo indicato sopra: la modifica viene effettuata senza necessità di motivazione, di norma entro pochi giorni.',
      ]},
      { h: 'Contenuti di terzi', p: [
        'Il sito rimanda a servizi esterni (mappe, messaggistica, motori di ricerca). Per i contenuti di tali servizi rispondono esclusivamente i rispettivi gestori.',
      ]},
      { h: 'Risoluzione delle controversie', p: [
        'La piattaforma europea per la risoluzione delle controversie online è raggiungibile all\'indirizzo ec.europa.eu/consumers/odr. Non siamo obbligati né disponibili a partecipare a procedure di conciliazione davanti a un organismo di risoluzione delle controversie dei consumatori.',
      ]},
    ],
  },
  en: {
    titel: 'Legal notice',
    beschreibung: 'Site owner, contact details and limits of liability.',
    stand: STAND,
    abschnitte: [
      { h: 'Site owner', p: [
        'This site is a private, non-commercial initiative. It involves no form of property brokerage.',
      ]},
      { h: 'Nature of the service', p: [
        'This site is not an estate agency, does not act as a broker and receives no commission of any kind.',
        'The information published here is taken from VENDESI and AFFITTASI signs displayed in public in the historic centre of Irsina, and is reproduced without any guarantee of accuracy, currency, availability or price.',
        'All negotiations take place directly and exclusively between the parties concerned.',
      ]},
      { h: 'Corrections and removals', p: [
        'If you own a property listed here and would like an entry corrected, updated or removed, simply write to the address above. The change is made without any need to give reasons, normally within a few days.',
      ]},
      { h: 'Third-party content', p: [
        'The site links to external services (maps, messaging, search engines). Responsibility for the content of those services lies solely with their respective operators.',
      ]},
      { h: 'Dispute resolution', p: [
        'The European Online Dispute Resolution platform is available at ec.europa.eu/consumers/odr. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration body.',
      ]},
    ],
  },
  de: {
    titel: 'Impressum',
    beschreibung: 'Anbieter der Seite, Kontakt und Haftungsgrenzen.',
    stand: STAND,
    abschnitte: [
      { h: 'Anbieter', p: [
        'Diese Seite ist eine private, nicht gewerbliche Initiative. Eine Immobilienvermittlung findet in keiner Form statt.',
      ]},
      { h: 'Art des Angebots', p: [
        'Diese Seite ist kein Immobilienmakler, vermittelt nicht und erhält keinerlei Provision.',
        'Die veröffentlichten Angaben stammen von VENDESI- und AFFITTASI-Schildern, die im öffentlichen Raum der Altstadt von Irsina angebracht sind. Sie werden ohne Gewähr für Richtigkeit, Aktualität, Verfügbarkeit oder Preis wiedergegeben.',
        'Verhandlungen finden ausschließlich unmittelbar zwischen den Beteiligten statt.',
      ]},
      { h: 'Hinweise und Löschungen', p: [
        'Wer Eigentümerin oder Eigentümer eines hier aufgeführten Objekts ist und eine Berichtigung, Aktualisierung oder Entfernung des Eintrags wünscht, schreibt einfach an die oben genannte Adresse. Die Änderung erfolgt ohne Begründungspflicht, in der Regel innerhalb weniger Tage.',
      ]},
      { h: 'Fremde Inhalte', p: [
        'Die Seite verweist auf externe Dienste (Karten, Messenger, Suchmaschinen). Für deren Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich.',
      ]},
      { h: 'Streitbeilegung', p: [
        'Die Europäische Plattform zur Online-Streitbeilegung ist erreichbar unter ec.europa.eu/consumers/odr. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir weder verpflichtet noch bereit.',
      ]},
    ],
  },
  nl: {
    titel: 'Colofon',
    beschreibung: 'Beheerder van de site, contactgegevens en aansprakelijkheid.',
    stand: STAND,
    abschnitte: [
      { h: 'Beheerder', p: [
        'Deze site is een particulier, niet-commercieel initiatief. Er is geen sprake van enige vorm van makelaardij.',
      ]},
      { h: 'Aard van de dienst', p: [
        'Deze site is geen makelaarskantoor, bemiddelt niet en ontvangt geen enkele commissie.',
        'De gepubliceerde gegevens komen van VENDESI- en AFFITTASI-borden die in de openbare ruimte van het historische centrum van Irsina hangen. Ze worden weergegeven zonder garantie op juistheid, actualiteit, beschikbaarheid of prijs.',
        'Onderhandelingen verlopen uitsluitend rechtstreeks tussen de betrokken partijen.',
      ]},
      { h: 'Meldingen en verwijderingen', p: [
        'Bent u eigenaar van een hier vermeld pand en wilt u een correctie, actualisering of verwijdering van het item? Schrijf dan naar het bovenstaande adres. De wijziging wordt zonder opgaaf van redenen doorgevoerd, doorgaans binnen enkele dagen.',
      ]},
      { h: 'Inhoud van derden', p: [
        'De site verwijst naar externe diensten (kaarten, berichtendiensten, zoekmachines). Voor de inhoud daarvan zijn uitsluitend de betreffende aanbieders verantwoordelijk.',
      ]},
      { h: 'Geschillenbeslechting', p: [
        'Het Europese platform voor onlinegeschillenbeslechting is bereikbaar via ec.europa.eu/consumers/odr. Wij zijn niet verplicht en niet bereid deel te nemen aan een geschillenprocedure bij een consumentengeschillencommissie.',
      ]},
    ],
  },
  fr: {
    titel: 'Mentions légales',
    beschreibung: 'Éditeur du site, contact et limites de responsabilité.',
    stand: STAND,
    abschnitte: [
      { h: 'Éditeur du site', p: [
        'Ce site est une initiative privée et non commerciale. Il n\'exerce aucune forme d\'intermédiation immobilière.',
      ]},
      { h: 'Nature du service', p: [
        'Ce site n\'est pas une agence immobilière, n\'exerce aucune activité de courtage et ne perçoit aucune commission.',
        'Les informations publiées proviennent de panneaux VENDESI et AFFITTASI apposés sur la voie publique dans le centre historique d\'Irsina. Elles sont reproduites sans garantie d\'exactitude, d\'actualité, de disponibilité ni de prix.',
        'Toute négociation se déroule directement et exclusivement entre les parties concernées.',
      ]},
      { h: 'Signalements et retraits', p: [
        'Si vous êtes propriétaire d\'un bien mentionné ici et souhaitez une correction, une mise à jour ou le retrait de la fiche, il suffit d\'écrire à l\'adresse ci-dessus. La modification est effectuée sans obligation de motiver la demande, généralement sous quelques jours.',
      ]},
      { h: 'Contenus de tiers', p: [
        'Le site renvoie à des services externes (cartes, messageries, moteurs de recherche). Leurs contenus relèvent de la seule responsabilité de leurs exploitants respectifs.',
      ]},
      { h: 'Règlement des litiges', p: [
        'La plateforme européenne de règlement en ligne des litiges est accessible à l\'adresse ec.europa.eu/consumers/odr. Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement des litiges devant un organisme de médiation de la consommation.',
      ]},
    ],
  },
};

export const DATENSCHUTZ: Record<Sprache, Rechtstext> = {
  it: {
    titel: 'Informativa sulla privacy',
    beschreibung: 'Quali dati vengono trattati da questo sito — e quali no.',
    stand: STAND,
    abschnitte: [
      { h: 'In breve', p: [
        'Questo sito è composto da pagine statiche. Non usa cookie, non contiene strumenti di analisi o di tracciamento e non trasmette dati a reti pubblicitarie.',
      ]},
      { h: 'File di log del server', p: [
        'Il sito è ospitato da Cloudflare Pages (Cloudflare, Inc.). Come ogni server web, l\'infrastruttura registra tecnicamente le richieste, compreso l\'indirizzo IP abbreviato, per garantire il funzionamento e la sicurezza del servizio. Base giuridica: art. 6, par. 1, lett. f GDPR (interesse legittimo a un funzionamento sicuro).',
      ]},
      { h: 'Mappa', p: [
        'La mappa del paese viene caricata da openstreetmap.org solo dopo un vostro clic esplicito. Fino a quel momento non viene inviata alcuna richiesta a quel servizio. Se attivate la mappa, il vostro indirizzo IP viene trasmesso alla OpenStreetMap Foundation. Se scegliete di memorizzare la decisione, questa resta nel vostro browser (localStorage) e non raggiunge alcun server.',
      ]},
      { h: 'Numeri di telefono sui cartelli', p: [
        'I cartelli fotografati riportano spesso un numero di telefono privato. Questi numeri NON vengono pubblicati su questo sito. Le richieste passano attraverso l\'indirizzo e-mail indicato nelle note legali e vengono inoltrate al proprietario.',
        'Un numero viene mostrato soltanto se il proprietario ha espressamente acconsentito alla pubblicazione. Il consenso può essere revocato in qualsiasi momento, con effetto immediato.',
      ]},
      { h: 'Fotografie degli immobili', p: [
        'Le fotografie mostrano facciate visibili dalla via pubblica. Non vengono pubblicate immagini di persone, targhe di veicoli o interni privati. Se una fotografia vi riguarda e desiderate la rimozione, è sufficiente scriverci.',
      ]},
      { h: 'Contatto via e-mail', p: [
        'Se ci scrivete, il vostro messaggio e il vostro indirizzo e-mail vengono conservati per il tempo necessario a trattare la richiesta e a rispondere a eventuali domande successive. Base giuridica: art. 6, par. 1, lett. b e f GDPR.',
      ]},
      { h: 'I vostri diritti', p: [
        'Avete diritto di accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e opposizione. Per esercitarli è sufficiente una e-mail all\'indirizzo indicato nelle note legali.',
        'Avete inoltre il diritto di proporre reclamo a un\'autorità di controllo, in Italia il Garante per la protezione dei dati personali (garanteprivacy.it).',
      ]},
    ],
  },
  en: {
    titel: 'Privacy notice',
    beschreibung: 'What data this site processes — and what it does not.',
    stand: STAND,
    abschnitte: [
      { h: 'In short', p: [
        'This site consists of static pages. It sets no cookies, contains no analytics or tracking tools and passes no data to advertising networks.',
      ]},
      { h: 'Server logs', p: [
        'The site is hosted on Cloudflare Pages (Cloudflare, Inc.). Like any web server, the infrastructure technically records requests, including a shortened IP address, in order to keep the service running and secure. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in secure operation).',
      ]},
      { h: 'Map', p: [
        'The map of the village is loaded from openstreetmap.org only after you explicitly click to enable it. Until then, no request whatsoever is sent to that service. If you enable the map, your IP address is transmitted to the OpenStreetMap Foundation. If you choose to remember that decision, it stays in your browser (localStorage) and reaches no server.',
      ]},
      { h: 'Phone numbers on the signs', p: [
        'The photographed signs often show a private phone number. Those numbers are NOT published on this site. Enquiries go through the e-mail address given in the legal notice and are forwarded to the owner.',
        'A number is shown only where the owner has expressly consented to its publication. Consent can be withdrawn at any time, with immediate effect.',
      ]},
      { h: 'Photographs of the properties', p: [
        'The photographs show façades visible from the public street. No images of people, vehicle number plates or private interiors are published. If a photograph concerns you and you would like it removed, simply write to us.',
      ]},
      { h: 'Contact by e-mail', p: [
        'If you write to us, your message and e-mail address are kept for as long as is needed to handle your enquiry and any follow-up questions. Legal basis: Art. 6(1)(b) and (f) GDPR.',
      ]},
      { h: 'Your rights', p: [
        'You have the right of access, rectification, erasure, restriction of processing, data portability and objection. An e-mail to the address in the legal notice is enough to exercise them.',
        'You also have the right to lodge a complaint with a supervisory authority — in Italy the Garante per la protezione dei dati personali (garanteprivacy.it).',
      ]},
    ],
  },
  de: {
    titel: 'Datenschutzerklärung',
    beschreibung: 'Welche Daten diese Seite verarbeitet — und welche nicht.',
    stand: STAND,
    abschnitte: [
      { h: 'Kurz gefasst', p: [
        'Diese Seite besteht aus statischen Dateien. Sie setzt keine Cookies, enthält keine Analyse- oder Trackingwerkzeuge und gibt keine Daten an Werbenetzwerke weiter.',
      ]},
      { h: 'Server-Protokolle', p: [
        'Die Seite wird bei Cloudflare Pages (Cloudflare, Inc.) betrieben. Wie jeder Webserver protokolliert die Infrastruktur technisch bedingt die Abrufe, einschließlich einer gekürzten IP-Adresse, um Betrieb und Sicherheit zu gewährleisten. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb).',
      ]},
      { h: 'Karte', p: [
        'Die Ortskarte wird erst nach einem ausdrücklichen Klick von openstreetmap.org geladen. Vorher geht keinerlei Anfrage an diesen Dienst. Wenn Sie die Karte aktivieren, wird Ihre IP-Adresse an die OpenStreetMap Foundation übertragen. Merken Sie sich die Entscheidung, bleibt sie in Ihrem Browser (localStorage) und erreicht keinen Server.',
      ]},
      { h: 'Telefonnummern auf den Schildern', p: [
        'Die fotografierten Schilder nennen häufig eine private Telefonnummer. Diese Nummern werden auf dieser Seite NICHT veröffentlicht. Anfragen laufen über die im Impressum genannte E-Mail-Adresse und werden an die Eigentümer weitergeleitet.',
        'Eine Nummer erscheint nur dort, wo die Eigentümerin oder der Eigentümer der Veröffentlichung ausdrücklich zugestimmt hat. Die Einwilligung kann jederzeit mit sofortiger Wirkung widerrufen werden.',
      ]},
      { h: 'Fotos der Objekte', p: [
        'Die Fotos zeigen Fassaden, die von der öffentlichen Straße aus sichtbar sind. Abbildungen von Personen, Kfz-Kennzeichen oder privaten Innenräumen werden nicht veröffentlicht. Betrifft Sie ein Foto und wünschen Sie die Entfernung, genügt eine Nachricht.',
      ]},
      { h: 'Kontakt per E-Mail', p: [
        'Wenn Sie uns schreiben, werden Ihre Nachricht und Ihre E-Mail-Adresse so lange aufbewahrt, wie es zur Bearbeitung der Anfrage und für Anschlussfragen nötig ist. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.',
      ]},
      { h: 'Ihre Rechte', p: [
        'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Eine E-Mail an die im Impressum genannte Adresse genügt.',
        'Zudem steht Ihnen ein Beschwerderecht bei einer Aufsichtsbehörde zu — in Italien beim Garante per la protezione dei dati personali (garanteprivacy.it).',
      ]},
    ],
  },
  nl: {
    titel: 'Privacyverklaring',
    beschreibung: 'Welke gegevens deze site verwerkt — en welke niet.',
    stand: STAND,
    abschnitte: [
      { h: 'Kort samengevat', p: [
        'Deze site bestaat uit statische pagina\'s. Er worden geen cookies geplaatst, er zijn geen analyse- of trackinginstrumenten en er gaan geen gegevens naar advertentienetwerken.',
      ]},
      { h: 'Serverlogboeken', p: [
        'De site draait op Cloudflare Pages (Cloudflare, Inc.). Zoals elke webserver registreert de infrastructuur technisch de aanvragen, waaronder een ingekort IP-adres, om werking en veiligheid te waarborgen. Rechtsgrond: art. 6 lid 1 sub f AVG (gerechtvaardigd belang bij een veilige werking).',
      ]},
      { h: 'Kaart', p: [
        'De kaart van het dorp wordt pas na een uitdrukkelijke klik geladen van openstreetmap.org. Daarvoor gaat er geen enkele aanvraag naar die dienst. Schakelt u de kaart in, dan wordt uw IP-adres doorgegeven aan de OpenStreetMap Foundation. Kiest u ervoor die keuze te onthouden, dan blijft dat in uw browser (localStorage) en bereikt het geen server.',
      ]},
      { h: 'Telefoonnummers op de borden', p: [
        'Op de gefotografeerde borden staat vaak een privételefoonnummer. Die nummers worden op deze site NIET gepubliceerd. Aanvragen lopen via het e-mailadres in het colofon en worden doorgestuurd naar de eigenaar.',
        'Een nummer verschijnt alleen wanneer de eigenaar uitdrukkelijk met publicatie heeft ingestemd. De toestemming kan op elk moment met onmiddellijke ingang worden ingetrokken.',
      ]},
      { h: 'Foto\'s van de panden', p: [
        'De foto\'s tonen gevels die zichtbaar zijn vanaf de openbare weg. Afbeeldingen van personen, kentekenplaten of privé-interieurs worden niet gepubliceerd. Betreft een foto u en wilt u verwijdering, dan volstaat een bericht.',
      ]},
      { h: 'Contact per e-mail', p: [
        'Schrijft u ons, dan worden uw bericht en e-mailadres bewaard zolang dat nodig is om uw vraag en eventuele vervolgvragen af te handelen. Rechtsgrond: art. 6 lid 1 sub b en f AVG.',
      ]},
      { h: 'Uw rechten', p: [
        'U hebt recht op inzage, rectificatie, verwijdering, beperking van de verwerking, gegevensoverdraagbaarheid en bezwaar. Een e-mail naar het adres in het colofon volstaat.',
        'Daarnaast hebt u het recht een klacht in te dienen bij een toezichthoudende autoriteit — in Italië de Garante per la protezione dei dati personali (garanteprivacy.it).',
      ]},
    ],
  },
  fr: {
    titel: 'Politique de confidentialité',
    beschreibung: 'Quelles données ce site traite — et lesquelles il ne traite pas.',
    stand: STAND,
    abschnitte: [
      { h: 'En bref', p: [
        'Ce site est constitué de pages statiques. Il ne dépose aucun cookie, ne contient aucun outil de mesure d\'audience ou de pistage et ne transmet aucune donnée à des régies publicitaires.',
      ]},
      { h: 'Journaux du serveur', p: [
        'Le site est hébergé par Cloudflare Pages (Cloudflare, Inc.). Comme tout serveur web, l\'infrastructure enregistre techniquement les requêtes, y compris une adresse IP tronquée, afin d\'assurer le fonctionnement et la sécurité du service. Base légale : art. 6, § 1, point f du RGPD (intérêt légitime à un fonctionnement sûr).',
      ]},
      { h: 'Carte', p: [
        'La carte du village n\'est chargée depuis openstreetmap.org qu\'après un clic explicite de votre part. Auparavant, aucune requête n\'est envoyée à ce service. Si vous activez la carte, votre adresse IP est transmise à la OpenStreetMap Foundation. Si vous choisissez de mémoriser ce choix, il reste dans votre navigateur (localStorage) et n\'atteint aucun serveur.',
      ]},
      { h: 'Numéros de téléphone sur les panneaux', p: [
        'Les panneaux photographiés portent souvent un numéro de téléphone privé. Ces numéros ne sont PAS publiés sur ce site. Les demandes passent par l\'adresse e-mail indiquée dans les mentions légales et sont transmises au propriétaire.',
        'Un numéro n\'apparaît que lorsque le propriétaire a expressément consenti à sa publication. Le consentement peut être retiré à tout moment, avec effet immédiat.',
      ]},
      { h: 'Photographies des biens', p: [
        'Les photographies montrent des façades visibles depuis la voie publique. Aucune image de personnes, de plaques d\'immatriculation ou d\'intérieurs privés n\'est publiée. Si une photographie vous concerne et que vous en souhaitez le retrait, un simple message suffit.',
      ]},
      { h: 'Contact par e-mail', p: [
        'Si vous nous écrivez, votre message et votre adresse e-mail sont conservés le temps nécessaire au traitement de votre demande et aux questions qui pourraient suivre. Base légale : art. 6, § 1, points b et f du RGPD.',
      ]},
      { h: 'Vos droits', p: [
        'Vous disposez d\'un droit d\'accès, de rectification, d\'effacement, de limitation du traitement, de portabilité et d\'opposition. Un e-mail à l\'adresse figurant dans les mentions légales suffit.',
        'Vous avez également le droit d\'introduire une réclamation auprès d\'une autorité de contrôle — en Italie, le Garante per la protezione dei dati personali (garanteprivacy.it).',
      ]},
    ],
  },
};
