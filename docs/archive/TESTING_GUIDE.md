# Guide de Tests - Système de Gestion de Garanties

## Vue d'ensemble

Ce projet utilise **Vitest** comme framework de test avec **React Testing Library** pour tester les composants React.

## Structure des Tests

```
src/
├── __tests__/
│   ├── components/     # Tests des composants React
│   ├── hooks/          # Tests des hooks personnalisés
│   └── utils/          # Tests des fonctions utilitaires
├── test/
│   ├── setup.ts        # Configuration globale des tests
│   └── mocks/          # Mocks réutilisables (Supabase, etc.)
```

## Scripts Disponibles

```bash
# Lancer les tests en mode watch (développement)
npm test

# Lancer les tests une fois
npm run test:run

# Lancer les tests avec interface UI
npm run test:ui

# Générer un rapport de couverture
npm run test:coverage

# Valider tout le code (TypeScript + Linter + Tests)
npm run validate
```

## Écrire des Tests

### Tests de Composants

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonComposant } from '../../components/MonComposant';

describe('MonComposant', () => {
  it('should render correctly', () => {
    render(<MonComposant title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Tests de Hooks

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonHook } from '../../hooks/useMonHook';

describe('useMonHook', () => {
  it('should return correct value', () => {
    const { result } = renderHook(() => useMonHook());
    expect(result.current.value).toBe(expectedValue);
  });
});
```

### Tests d'Utilitaires

```typescript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../../lib/utils';

describe('maFonction', () => {
  it('should process input correctly', () => {
    expect(maFonction('input')).toBe('output');
  });
});
```

## Mocking Supabase

Utilisez le mock Supabase fourni pour les tests:

```typescript
import { vi } from 'vitest';
import { mockSupabaseClient, createMockSupabaseResponse } from '../test/mocks/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Configurer une réponse spécifique
mockSupabaseClient.from.mockReturnValue({
  select: vi.fn().mockResolvedValue(
    createMockSupabaseResponse([{ id: 1, name: 'Test' }])
  ),
});
```

## Bonnes Pratiques

1. **Testez le comportement, pas l'implémentation** - Concentrez-vous sur ce que fait le code, pas comment il le fait
2. **Un test, un concept** - Chaque test doit vérifier une seule chose
3. **Nommage descriptif** - Les noms de tests doivent clairement décrire ce qui est testé
4. **Arrange, Act, Assert** - Organisez vos tests en trois sections claires
5. **Tests indépendants** - Chaque test doit pouvoir s'exécuter seul
6. **Utilisez beforeEach pour la configuration commune** - Évitez la duplication de code

## Coverage

Le projet vise:
- **60%+ de couverture globale**
- **70%+ pour les utilitaires critiques**
- **50%+ pour les composants UI**

## Dépannage

### Les tests sont lents
- Utilisez `it.only()` pour exécuter un seul test pendant le développement
- Utilisez `--no-coverage` pour des tests plus rapides

### Erreurs de mock
- Vérifiez que les mocks sont importés avant les modules qui les utilisent
- Utilisez `vi.clearAllMocks()` dans `beforeEach` pour réinitialiser

### Erreurs de types TypeScript
- Assurez-vous que `@testing-library/jest-dom/vitest` est importé dans setup.ts
- Vérifiez que les types sont à jour: `npm install --save-dev @types/...`

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
