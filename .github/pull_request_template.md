<!--
Titre de la PR : <type>/TL-<numéro du ticket>_<description-courte> (en général, le nom de la branche)
Types : feat, fix, chore, docs, refactor, test, ci
Exemple : feat/TL-12_connexion-utilisateur
(« TL » pour Travel Larper.)
-->

## Ticket

TL-<numéro> : <!-- lien vers le ticket -->

## Ce que fait cette PR

<!-- Une ou deux phrases. -->

## Vérifications

- [ ] Le titre respecte le format `<type>/TL-<numéro>_<description-courte>`
- [ ] `make generate` : le contrat `api/openapi.yaml` est à jour et le code est régénéré
- [ ] `make lint` passe, avec les commentaires sur tout ce qui est exporté
- [ ] `make test` passe, et les tests couvrent le cas nominal et les accès refusés
- [ ] `make dev` démarre tout, sans étape manuelle
