import { FileText } from 'lucide-react';

export function LicenseAgreement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-8 py-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">End-User License Agreement</h1>
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
              <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Acceptation des conditions</h2>
              <p className="leading-relaxed">
                En accédant et en utilisant Garantie Pro Remorque ("l'Application"), vous acceptez d'être lié par les présentes conditions d'utilisation.
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'Application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Description du service</h2>
              <p className="leading-relaxed mb-3">
                Garantie Pro Remorque est une plateforme de gestion de garanties pour remorques qui permet aux concessionnaires de:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Créer et gérer des contrats de garantie</li>
                <li>Suivre les réclamations et les demandes de service</li>
                <li>Gérer l'inventaire de remorques</li>
                <li>Synchroniser avec QuickBooks et Stripe</li>
                <li>Générer des rapports et des analyses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Licence d'utilisation</h2>
              <p className="leading-relaxed mb-3">
                Sous réserve de votre conformité avec les présentes conditions, nous vous accordons une licence limitée, non exclusive, non transférable et révocable pour:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Accéder et utiliser l'Application à des fins commerciales légitimes</li>
                <li>Créer et gérer des garanties pour vos clients</li>
                <li>Accéder aux fonctionnalités et services inclus dans votre plan d'abonnement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Restrictions d'utilisation</h2>
              <p className="leading-relaxed mb-3">Vous vous engagez à ne pas:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copier, modifier ou distribuer l'Application</li>
                <li>Effectuer de l'ingénierie inverse ou tenter d'extraire le code source</li>
                <li>Utiliser l'Application de manière frauduleuse ou illégale</li>
                <li>Partager vos identifiants de connexion avec des tiers</li>
                <li>Utiliser l'Application pour envoyer du spam ou du contenu malveillant</li>
                <li>Surcharger ou perturber les serveurs de l'Application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Propriété intellectuelle</h2>
              <p className="leading-relaxed">
                L'Application, son contenu, ses fonctionnalités et tous les droits de propriété intellectuelle associés restent la propriété exclusive
                de Garantie Pro Remorque. Vous conservez la propriété de vos données clients et des garanties que vous créez via l'Application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Protection des données</h2>
              <p className="leading-relaxed">
                Nous nous engageons à protéger vos données conformément aux lois canadiennes sur la protection des données, notamment la LPRPDE
                (Loi sur la protection des renseignements personnels et les documents électroniques) et la Loi 25 du Québec.
                Consultez notre Politique de confidentialité pour plus de détails.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Frais et paiements</h2>
              <p className="leading-relaxed mb-3">
                L'utilisation de l'Application peut être soumise à des frais d'abonnement. Vous acceptez de:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payer tous les frais applicables selon le plan choisi</li>
                <li>Fournir des informations de paiement exactes et à jour</li>
                <li>Autoriser les renouvellements automatiques selon votre plan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Résiliation</h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de suspendre ou de résilier votre accès à l'Application en cas de violation des présentes conditions.
                Vous pouvez également résilier votre compte à tout moment depuis les paramètres de l'Application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Limitation de responsabilité</h2>
              <p className="leading-relaxed">
                L'Application est fournie "en l'état" sans garantie d'aucune sorte. Nous ne serons pas responsables des dommages indirects,
                accessoires ou consécutifs découlant de l'utilisation ou de l'impossibilité d'utiliser l'Application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">10. Modifications</h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications seront effectives dès leur publication.
                Votre utilisation continue de l'Application constitue votre acceptation des conditions modifiées.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">11. Loi applicable</h2>
              <p className="leading-relaxed">
                Ces conditions sont régies par les lois de la province de Québec et les lois du Canada qui s'y appliquent.
                Tout litige découlant de ces conditions sera soumis à la juridiction exclusive des tribunaux du Québec.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">12. Contact</h2>
              <p className="leading-relaxed">
                Pour toute question concernant ces conditions, veuillez nous contacter:
              </p>
              <div className="mt-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-medium text-slate-900">Garantie Pro Remorque</p>
                <p className="text-slate-600">Email: info@garantieproremorque.com</p>
                <p className="text-slate-600">Site web: https://www.garantieproremorque.com</p>
              </div>
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
