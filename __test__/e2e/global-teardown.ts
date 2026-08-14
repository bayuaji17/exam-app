import { deleteCreatedTestUsers } from "./fixtures/created-users"
import { deleteSeededBanks } from "./fixtures/seeded-banks"
import { deleteSeededCategories } from "./fixtures/seeded-categories"
import { deleteSeededQuestions } from "./fixtures/seeded-questions"

/**
 * Remove the accounts created during the run.
 *
 * This has to be global rather than a per-file `afterAll`: with
 * `fullyParallel` the file's tests are spread across workers, each of which
 * runs its own `afterAll`. A worker finishing early would delete rows while
 * another worker was still mid-create — and because Better Auth writes the
 * `user` row and its `account` row in two steps, the delete landing between
 * them broke the account insert's foreign key and the endpoint answered 500.
 *
 * Questions come first: the question -> bank foreign key is RESTRICT, so
 * banks cannot be deleted while their questions still exist.
 */
export default async function globalTeardown() {
  await deleteCreatedTestUsers()
  await deleteSeededQuestions()
  await deleteSeededBanks()
  await deleteSeededCategories()
}
