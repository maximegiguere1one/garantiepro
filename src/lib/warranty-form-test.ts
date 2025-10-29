/**
 * Test complet du formulaire de création de garantie
 * Ce fichier contient tous les tests de validation pour assurer que le formulaire fonctionne correctement
 */

import {
  validateCustomer,
  validateTrailer,
  validateSignatureData,
  validateOrganization,
  validateWarrantyPlan,
  validateBeforeSignature,
  validateAfterSignature,
  type CustomerValidation,
  type TrailerValidation,
  type SignatureDataValidation,
} from './warranty-validation';

// Données de test valides
export const VALID_TEST_CUSTOMER: CustomerValidation = {
  firstName: 'Jean',
  lastName: 'Tremblay',
  email: 'jean.tremblay@example.com',
  phone: '514-555-1234',
  address: '123 Rue Principale',
  city: 'Montréal',
  province: 'QC',
  postalCode: 'H1A 1A1',
};

export const VALID_TEST_TRAILER: TrailerValidation = {
  vin: '1HGBH41JXMN109186',
  make: 'Cargo Pro',
  model: 'Stealth',
  year: 2024,
  trailerType: 'Enclosed',
  purchasePrice: 15000,
  purchaseDate: new Date().toISOString().split('T')[0],
  manufacturerWarrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

export const VALID_TEST_SIGNATURE: SignatureDataValidation = {
  signerFullName: 'Jean Tremblay',
  signerEmail: 'jean.tremblay@example.com',
  signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  documentHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  consentGiven: true,
  consentTimestamp: new Date().toISOString(),
};

export const VALID_ORGANIZATION_ID = 'a0000000-0000-0000-0000-000000000001';
export const VALID_PLAN_ID = '021e59fd-12c9-43a0-a6fd-50dbb8a2a12f';

/**
 * Test Suite 1: Validation des données client
 */
export function testCustomerValidation() {
  console.log('\n========================================');
  console.log('TEST SUITE 1: VALIDATION CLIENT');
  console.log('========================================\n');

  // Test 1.1: Client valide
  console.log('Test 1.1: Client avec toutes les données valides');
  const validResult = validateCustomer(VALID_TEST_CUSTOMER);
  console.log('✓ Résultat:', validResult.valid ? 'PASS' : 'FAIL');
  if (!validResult.valid) {
    console.log('  Erreurs:', validResult.errors);
  }
  if (validResult.warnings.length > 0) {
    console.log('  Avertissements:', validResult.warnings);
  }

  // Test 1.2: Prénom manquant
  console.log('\nTest 1.2: Client sans prénom');
  const noFirstName = validateCustomer({ ...VALID_TEST_CUSTOMER, firstName: '' });
  console.log('✓ Résultat:', !noFirstName.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noFirstName.errors);

  // Test 1.3: Email invalide
  console.log('\nTest 1.3: Email invalide');
  const invalidEmail = validateCustomer({ ...VALID_TEST_CUSTOMER, email: 'email-invalide' });
  console.log('✓ Résultat:', !invalidEmail.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', invalidEmail.errors);

  // Test 1.4: Téléphone trop court
  console.log('\nTest 1.4: Téléphone trop court');
  const shortPhone = validateCustomer({ ...VALID_TEST_CUSTOMER, phone: '123' });
  console.log('✓ Résultat:', !shortPhone.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', shortPhone.errors);

  // Test 1.5: Code postal invalide
  console.log('\nTest 1.5: Code postal invalide (devrait donner un avertissement)');
  const invalidPostal = validateCustomer({ ...VALID_TEST_CUSTOMER, postalCode: '12345' });
  console.log('✓ Résultat:', invalidPostal.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements attendus:', invalidPostal.warnings);

  return {
    total: 5,
    passed: [
      validResult.valid,
      !noFirstName.valid,
      !invalidEmail.valid,
      !shortPhone.valid,
      invalidPostal.valid && invalidPostal.warnings.length > 0,
    ].filter(Boolean).length,
  };
}

/**
 * Test Suite 2: Validation des données remorque
 */
export function testTrailerValidation() {
  console.log('\n========================================');
  console.log('TEST SUITE 2: VALIDATION REMORQUE');
  console.log('========================================\n');

  // Test 2.1: Remorque valide
  console.log('Test 2.1: Remorque avec toutes les données valides');
  const validResult = validateTrailer(VALID_TEST_TRAILER);
  console.log('✓ Résultat:', validResult.valid ? 'PASS' : 'FAIL');
  if (!validResult.valid) {
    console.log('  Erreurs:', validResult.errors);
  }

  // Test 2.2: VIN invalide (longueur incorrecte)
  console.log('\nTest 2.2: VIN trop court (devrait donner un avertissement)');
  const shortVin = validateTrailer({ ...VALID_TEST_TRAILER, vin: '1234567890' });
  console.log('✓ Résultat:', shortVin.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements:', shortVin.warnings);

  // Test 2.3: Prix d'achat invalide (zéro)
  console.log('\nTest 2.3: Prix d\'achat à 0 (invalide)');
  const zeroPriceResult = validateTrailer({ ...VALID_TEST_TRAILER, purchasePrice: 0 });
  console.log('✓ Résultat:', !zeroPriceResult.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', zeroPriceResult.errors);

  // Test 2.4: Prix d'achat négatif
  console.log('\nTest 2.4: Prix d\'achat négatif (invalide)');
  const negativePriceResult = validateTrailer({ ...VALID_TEST_TRAILER, purchasePrice: -5000 });
  console.log('✓ Résultat:', !negativePriceResult.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', negativePriceResult.errors);

  // Test 2.5: Date de garantie fabricant avant date d'achat
  console.log('\nTest 2.5: Date garantie fabricant avant date d\'achat (invalide)');
  const invalidWarrantyDate = validateTrailer({
    ...VALID_TEST_TRAILER,
    purchaseDate: '2024-12-01',
    manufacturerWarrantyEndDate: '2024-11-01',
  });
  console.log('✓ Résultat:', !invalidWarrantyDate.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', invalidWarrantyDate.errors);

  // Test 2.6: Année dans le futur
  console.log('\nTest 2.6: Année dans le futur (devrait donner un avertissement)');
  const futureYear = validateTrailer({ ...VALID_TEST_TRAILER, year: new Date().getFullYear() + 5 });
  console.log('✓ Résultat:', futureYear.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements:', futureYear.warnings);

  // Test 2.7: Prix très élevé
  console.log('\nTest 2.7: Prix très élevé (devrait donner un avertissement)');
  const highPrice = validateTrailer({ ...VALID_TEST_TRAILER, purchasePrice: 2000000 });
  console.log('✓ Résultat:', highPrice.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements:', highPrice.warnings);

  return {
    total: 7,
    passed: [
      validResult.valid,
      shortVin.valid && shortVin.warnings.length > 0,
      !zeroPriceResult.valid,
      !negativePriceResult.valid,
      !invalidWarrantyDate.valid,
      futureYear.valid && futureYear.warnings.length > 0,
      highPrice.valid && highPrice.warnings.length > 0,
    ].filter(Boolean).length,
  };
}

/**
 * Test Suite 3: Validation des données de signature
 */
export function testSignatureValidation() {
  console.log('\n========================================');
  console.log('TEST SUITE 3: VALIDATION SIGNATURE');
  console.log('========================================\n');

  // Test 3.1: Signature valide
  console.log('Test 3.1: Signature avec toutes les données valides');
  const validResult = validateSignatureData(VALID_TEST_SIGNATURE);
  console.log('✓ Résultat:', validResult.valid ? 'PASS' : 'FAIL');
  if (!validResult.valid) {
    console.log('  Erreurs:', validResult.errors);
  }

  // Test 3.2: Nom du signataire manquant
  console.log('\nTest 3.2: Nom du signataire manquant');
  const noName = validateSignatureData({ ...VALID_TEST_SIGNATURE, signerFullName: '' });
  console.log('✓ Résultat:', !noName.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noName.errors);

  // Test 3.3: Signature manquante
  console.log('\nTest 3.3: Signature manquante');
  const noSignature = validateSignatureData({ ...VALID_TEST_SIGNATURE, signatureDataUrl: '' });
  console.log('✓ Résultat:', !noSignature.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noSignature.errors);

  // Test 3.4: Consentement non donné
  console.log('\nTest 3.4: Consentement non donné');
  const noConsent = validateSignatureData({ ...VALID_TEST_SIGNATURE, consentGiven: false });
  console.log('✓ Résultat:', !noConsent.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noConsent.errors);

  // Test 3.5: Hash de document invalide
  console.log('\nTest 3.5: Hash de document trop court (devrait donner un avertissement)');
  const shortHash = validateSignatureData({ ...VALID_TEST_SIGNATURE, documentHash: 'abcd1234' });
  console.log('✓ Résultat:', shortHash.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements:', shortHash.warnings);

  // Test 3.6: Format de signature invalide
  console.log('\nTest 3.6: Format de signature invalide');
  const invalidFormat = validateSignatureData({ ...VALID_TEST_SIGNATURE, signatureDataUrl: 'not-a-data-url' });
  console.log('✓ Résultat:', !invalidFormat.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', invalidFormat.errors);

  return {
    total: 6,
    passed: [
      validResult.valid,
      !noName.valid,
      !noSignature.valid,
      !noConsent.valid,
      shortHash.valid && shortHash.warnings.length > 0,
      !invalidFormat.valid,
    ].filter(Boolean).length,
  };
}

/**
 * Test Suite 4: Validation de l'organisation et du plan
 */
export function testOrganizationAndPlanValidation() {
  console.log('\n========================================');
  console.log('TEST SUITE 4: VALIDATION ORGANISATION & PLAN');
  console.log('========================================\n');

  // Test 4.1: Organisation valide
  console.log('Test 4.1: Organisation ID valide (UUID)');
  const validOrg = validateOrganization(VALID_ORGANIZATION_ID);
  console.log('✓ Résultat:', validOrg.valid ? 'PASS' : 'FAIL');

  // Test 4.2: Organisation manquante
  console.log('\nTest 4.2: Organisation ID manquante');
  const noOrg = validateOrganization(null);
  console.log('✓ Résultat:', !noOrg.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noOrg.errors);

  // Test 4.3: Organisation ID invalide (pas un UUID)
  console.log('\nTest 4.3: Organisation ID invalide (pas un UUID)');
  const invalidOrg = validateOrganization('not-a-uuid');
  console.log('✓ Résultat:', !invalidOrg.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', invalidOrg.errors);

  // Test 4.4: Plan de garantie valide
  console.log('\nTest 4.4: Plan ID valide (UUID)');
  const validPlan = validateWarrantyPlan(VALID_PLAN_ID);
  console.log('✓ Résultat:', validPlan.valid ? 'PASS' : 'FAIL');

  // Test 4.5: Plan manquant
  console.log('\nTest 4.5: Plan ID manquant');
  const noPlan = validateWarrantyPlan(null);
  console.log('✓ Résultat:', !noPlan.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noPlan.errors);

  return {
    total: 5,
    passed: [
      validOrg.valid,
      !noOrg.valid,
      !invalidOrg.valid,
      validPlan.valid,
      !noPlan.valid,
    ].filter(Boolean).length,
  };
}

/**
 * Test Suite 5: Validation complète avant signature
 */
export function testCompleteValidationBeforeSignature() {
  console.log('\n========================================');
  console.log('TEST SUITE 5: VALIDATION COMPLÈTE AVANT SIGNATURE');
  console.log('========================================\n');

  // Test 5.1: Toutes les données valides
  console.log('Test 5.1: Validation complète avec toutes les données valides');
  const allValid = validateBeforeSignature(
    VALID_TEST_CUSTOMER,
    VALID_TEST_TRAILER,
    VALID_ORGANIZATION_ID,
    VALID_PLAN_ID
  );
  console.log('✓ Résultat:', allValid.valid ? 'PASS' : 'FAIL');
  if (!allValid.valid) {
    console.log('  Erreurs:', allValid.errors);
  }
  console.log('  Avertissements:', allValid.warnings.length > 0 ? allValid.warnings : 'Aucun');

  // Test 5.2: Organisation manquante (critique)
  console.log('\nTest 5.2: Organisation manquante (devrait échouer)');
  const noOrg = validateBeforeSignature(
    VALID_TEST_CUSTOMER,
    VALID_TEST_TRAILER,
    null,
    VALID_PLAN_ID
  );
  console.log('✓ Résultat:', !noOrg.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', noOrg.errors);

  // Test 5.3: Plusieurs erreurs combinées
  console.log('\nTest 5.3: Plusieurs erreurs combinées');
  const multipleErrors = validateBeforeSignature(
    { ...VALID_TEST_CUSTOMER, email: 'invalid-email', phone: '123' },
    { ...VALID_TEST_TRAILER, purchasePrice: 0 },
    VALID_ORGANIZATION_ID,
    null
  );
  console.log('✓ Résultat:', !multipleErrors.valid ? 'PASS' : 'FAIL');
  console.log('  Nombre d\'erreurs:', multipleErrors.errors.length);
  console.log('  Erreurs:', multipleErrors.errors);

  return {
    total: 3,
    passed: [
      allValid.valid,
      !noOrg.valid && noOrg.errors.some(e => e.includes('organisation')),
      !multipleErrors.valid && multipleErrors.errors.length >= 3,
    ].filter(Boolean).length,
  };
}

/**
 * Test Suite 6: Validation après signature
 */
export function testCompleteValidationAfterSignature() {
  console.log('\n========================================');
  console.log('TEST SUITE 6: VALIDATION APRÈS SIGNATURE');
  console.log('========================================\n');

  // Test 6.1: Signature valide avec email correspondant
  console.log('Test 6.1: Signature valide avec email correspondant au client');
  const validAfterSignature = validateAfterSignature(
    VALID_TEST_SIGNATURE,
    VALID_TEST_CUSTOMER.email
  );
  console.log('✓ Résultat:', validAfterSignature.valid ? 'PASS' : 'FAIL');
  if (!validAfterSignature.valid) {
    console.log('  Erreurs:', validAfterSignature.errors);
  }

  // Test 6.2: Email du signataire différent (avertissement)
  console.log('\nTest 6.2: Email du signataire différent du client (devrait donner un avertissement)');
  const differentEmail = validateAfterSignature(
    { ...VALID_TEST_SIGNATURE, signerEmail: 'autre@example.com' },
    VALID_TEST_CUSTOMER.email
  );
  console.log('✓ Résultat:', differentEmail.valid ? 'PASS' : 'FAIL');
  console.log('  Avertissements:', differentEmail.warnings);

  // Test 6.3: Données de signature invalides
  console.log('\nTest 6.3: Données de signature invalides');
  const invalidSignature = validateAfterSignature(
    { ...VALID_TEST_SIGNATURE, consentGiven: false, signatureDataUrl: '' },
    VALID_TEST_CUSTOMER.email
  );
  console.log('✓ Résultat:', !invalidSignature.valid ? 'PASS' : 'FAIL');
  console.log('  Erreurs attendues:', invalidSignature.errors);

  return {
    total: 3,
    passed: [
      validAfterSignature.valid,
      differentEmail.valid && differentEmail.warnings.length > 0,
      !invalidSignature.valid,
    ].filter(Boolean).length,
  };
}

/**
 * Fonction principale pour exécuter tous les tests
 */
export function runAllWarrantyFormTests() {
  console.log('\n');
  console.log('================================================================================');
  console.log('         TEST COMPLET DU FORMULAIRE DE CRÉATION DE GARANTIE');
  console.log('================================================================================');
  console.log('');
  console.log('Ce test vérifie toutes les validations du formulaire de création de garantie');
  console.log('pour s\'assurer que tout fonctionne correctement avant de créer une garantie.');
  console.log('');
  console.log('================================================================================');

  const results: { suite: string; total: number; passed: number }[] = [];

  try {
    results.push({ suite: 'Validation Client', ...testCustomerValidation() });
    results.push({ suite: 'Validation Remorque', ...testTrailerValidation() });
    results.push({ suite: 'Validation Signature', ...testSignatureValidation() });
    results.push({ suite: 'Validation Organisation & Plan', ...testOrganizationAndPlanValidation() });
    results.push({ suite: 'Validation Complète Avant Signature', ...testCompleteValidationBeforeSignature() });
    results.push({ suite: 'Validation Après Signature', ...testCompleteValidationAfterSignature() });

    // Résumé des résultats
    console.log('\n');
    console.log('================================================================================');
    console.log('                           RÉSUMÉ DES TESTS');
    console.log('================================================================================\n');

    let totalTests = 0;
    let totalPassed = 0;

    results.forEach((result) => {
      const percentage = Math.round((result.passed / result.total) * 100);
      const status = result.passed === result.total ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${result.suite}: ${result.passed}/${result.total} (${percentage}%)`);
      totalTests += result.total;
      totalPassed += result.passed;
    });

    const overallPercentage = Math.round((totalPassed / totalTests) * 100);
    console.log('\n' + '─'.repeat(80));
    console.log(`TOTAL: ${totalPassed}/${totalTests} tests réussis (${overallPercentage}%)`);
    console.log('─'.repeat(80) + '\n');

    if (totalPassed === totalTests) {
      console.log('✓✓✓ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS! ✓✓✓');
      console.log('\nLe formulaire de création de garantie est prêt à être utilisé.');
      console.log('Toutes les validations fonctionnent correctement.\n');
    } else {
      console.log('✗✗✗ CERTAINS TESTS ONT ÉCHOUÉ ✗✗✗');
      console.log('\nVeuillez vérifier les erreurs ci-dessus et corriger les problèmes.\n');
    }

    console.log('================================================================================\n');

    return {
      success: totalPassed === totalTests,
      totalTests,
      totalPassed,
      results,
    };
  } catch (error) {
    console.error('\n✗ ERREUR CRITIQUE lors de l\'exécution des tests:', error);
    console.error('\n================================================================================\n');
    throw error;
  }
}

// Exporter les fonctions pour utilisation individuelle
export default {
  runAllTests: runAllWarrantyFormTests,
  testCustomerValidation,
  testTrailerValidation,
  testSignatureValidation,
  testOrganizationAndPlanValidation,
  testCompleteValidationBeforeSignature,
  testCompleteValidationAfterSignature,
};
