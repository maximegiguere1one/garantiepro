import { Shield } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-8 py-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
                <p className="text-slate-300 mt-1">Garantie Pro Remorque</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-8 space-y-6 text-slate-700">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-900">
                <strong>Dernière mise à jour:</strong> 4 octobre 2025
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p className="leading-relaxed">
                Garantie Pro Remorque ("nous", "notre" ou "nos") s'engage à protéger la confidentialité de vos informations personnelles.
                Cette politique de confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos données
                conformément aux lois canadiennes, notamment la LPRPDE (Loi sur la protection des renseignements personnels et les documents électroniques)
                et la Loi 25 du Québec.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Informations que nous collectons</h2>

              <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">2.1 Informations d'identification</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom et prénom</li>
                <li>Adresse courriel</li>
                <li>Numéro de téléphone</li>
                <li>Adresse postale</li>
                <li>Informations de l'entreprise (nom, adresse)</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">2.2 Informations clients et garanties</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Informations sur les clients finaux (avec leur consentement)</li>
                <li>Détails des remorques (VIN, marque, modèle, année)</li>
                <li>Contrats de garantie et historique des réclamations</li>
                <li>Documents et signatures électroniques</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">2.3 Informations de paiement</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Informations de carte de crédit (traitées par Stripe)</li>
                <li>Historique des transactions</li>
                <li>Informations de facturation</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">2.4 Informations techniques</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Adresse IP</li>
                <li>Type de navigateur et version</li>
                <li>Système d'exploitation</li>
                <li>Pages visitées et temps passé sur l'Application</li>
                <li>Logs d'utilisation et d'erreurs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Comment nous utilisons vos informations</h2>
              <p className="leading-relaxed mb-3">Nous utilisons vos informations pour:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir et maintenir les services de l'Application</li>
                <li>Créer et gérer votre compte utilisateur</li>
                <li>Traiter les contrats de garantie et les réclamations</li>
                <li>Traiter les paiements et prévenir la fraude</li>
                <li>Communiquer avec vous concernant votre compte et les services</li>
                <li>Améliorer nos services et développer de nouvelles fonctionnalités</li>
                <li>Assurer la sécurité et l'intégrité de l'Application</li>
                <li>Respecter nos obligations légales et réglementaires</li>
                <li>Générer des analyses et rapports anonymisés</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Base légale du traitement</h2>
              <p className="leading-relaxed mb-3">Nous traitons vos données personnelles sur la base de:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Exécution du contrat:</strong> Pour fournir les services que vous avez demandés</li>
                <li><strong>Consentement:</strong> Lorsque vous nous donnez votre permission explicite</li>
                <li><strong>Obligations légales:</strong> Pour respecter les lois et règlements applicables</li>
                <li><strong>Intérêts légitimes:</strong> Pour améliorer nos services et assurer la sécurité</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Partage de vos informations</h2>
              <p className="leading-relaxed mb-3">Nous pouvons partager vos informations avec:</p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">5.1 Fournisseurs de services</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Supabase:</strong> Hébergement de base de données et authentification</li>
                <li><strong>Stripe:</strong> Traitement des paiements</li>
                <li><strong>QuickBooks:</strong> Synchronisation comptable (avec votre autorisation)</li>
                <li><strong>Resend:</strong> Envoi de courriels transactionnels</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">5.2 Exigences légales</h3>
              <p className="leading-relaxed mb-4">
                Nous pouvons divulguer vos informations si requis par la loi, une ordonnance judiciaire, ou pour protéger nos droits légaux.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">5.3 Transferts d'entreprise</h3>
              <p className="leading-relaxed">
                En cas de fusion, acquisition ou vente d'actifs, vos informations peuvent être transférées au nouvel propriétaire.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Sécurité des données</h2>
              <p className="leading-relaxed mb-3">Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chiffrement des données en transit (HTTPS/SSL)</li>
                <li>Chiffrement des données sensibles au repos</li>
                <li>Authentification sécurisée et gestion des accès</li>
                <li>Surveillance et détection des intrusions</li>
                <li>Sauvegardes régulières et plans de récupération</li>
                <li>Formation du personnel sur la sécurité des données</li>
                <li>Audits de sécurité réguliers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Conservation des données</h2>
              <p className="leading-relaxed">
                Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales.
                Les contrats de garantie et les documents associés sont conservés conformément aux exigences légales applicables
                (généralement 7 ans après la fin du contrat). Vous pouvez demander la suppression de vos données en nous contactant.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Vos droits</h2>
              <p className="leading-relaxed mb-3">
                Conformément aux lois canadiennes sur la protection des données, vous avez le droit de:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Accès:</strong> Demander une copie de vos données personnelles</li>
                <li><strong>Rectification:</strong> Corriger des données inexactes ou incomplètes</li>
                <li><strong>Suppression:</strong> Demander la suppression de vos données (sous réserve d'obligations légales)</li>
                <li><strong>Portabilité:</strong> Recevoir vos données dans un format structuré</li>
                <li><strong>Opposition:</strong> Vous opposer au traitement de vos données</li>
                <li><strong>Retrait du consentement:</strong> Retirer votre consentement à tout moment</li>
                <li><strong>Plainte:</strong> Déposer une plainte auprès du Commissaire à la protection de la vie privée</li>
              </ul>
              <p className="leading-relaxed mt-3">
                Pour exercer ces droits, contactez-nous à info@garantieproremorque.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Cookies et technologies similaires</h2>
              <p className="leading-relaxed mb-3">
                Nous utilisons des cookies et technologies similaires pour:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintenir votre session utilisateur</li>
                <li>Mémoriser vos préférences</li>
                <li>Analyser l'utilisation de l'Application</li>
                <li>Assurer la sécurité de l'Application</li>
              </ul>
              <p className="leading-relaxed mt-3">
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Marketing et communications</h2>
              <p className="leading-relaxed">
                Nous vous enverrons uniquement des communications marketing si vous avez donné votre consentement explicite.
                Vous pouvez vous désabonner à tout moment en cliquant sur le lien de désinscription dans nos courriels
                ou en modifiant vos préférences dans les paramètres de votre compte.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">11. Protection des mineurs</h2>
              <p className="leading-relaxed">
                Notre Application n'est pas destinée aux personnes de moins de 18 ans. Nous ne collectons pas sciemment
                d'informations personnelles auprès de mineurs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">12. Modifications de cette politique</h2>
              <p className="leading-relaxed">
                Nous pouvons mettre à jour cette politique de confidentialité périodiquement. La date de la dernière mise à jour
                est indiquée en haut de cette page. Nous vous informerons de tout changement important par courriel ou via l'Application.
                Votre utilisation continue après ces modifications constitue votre acceptation de la politique révisée.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">13. Transferts internationaux</h2>
              <p className="leading-relaxed">
                Vos données peuvent être transférées et stockées sur des serveurs situés en dehors du Canada.
                Nous nous assurons que ces transferts sont effectués conformément aux lois canadiennes et que vos données
                bénéficient d'un niveau de protection approprié.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">14. Contact et plaintes</h2>
              <p className="leading-relaxed mb-3">
                Pour toute question concernant cette politique ou pour exercer vos droits, contactez-nous:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
                <p className="font-medium text-slate-900">Garantie Pro Remorque</p>
                <p className="text-slate-600">Email: info@garantieproremorque.com</p>
                <p className="text-slate-600">Site web: https://app.garantieproremorque.com</p>
              </div>
              <p className="leading-relaxed">
                Si vous n'êtes pas satisfait de notre réponse, vous pouvez déposer une plainte auprès du
                Commissariat à la protection de la vie privée du Canada (www.priv.gc.ca) ou de la Commission d'accès
                à l'information du Québec (www.cai.gouv.qc.ca).
              </p>
            </section>

            <div className="border-t border-slate-200 pt-6 mt-8">
              <p className="text-sm text-slate-500 text-center">
                © 2025 Garantie Pro Remorque. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
