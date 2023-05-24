import bcrypt from 'bcrypt';

function getHash(password: string, SALT_ROUNDS: string | number): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
function getSalt(SALT_ROUNDS = 10): Promise<string> {
  return bcrypt.genSalt(SALT_ROUNDS);
}

function getCompare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export default { getHash, getCompare, getSalt } as const;
