import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

@Injectable()
export class PasswordService implements OnModuleInit {
  /**
   * Pre-computed at startup so dummyCompare always uses a syntactically valid
   * hash that forces bcrypt to run the full 2^cost rounds.
   */
  private dummyHash!: string;

  async onModuleInit(): Promise<void> {
    this.dummyHash = await bcrypt.hash('__dummy_sentinel__', BCRYPT_COST);
  }

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
  }

  /**
   * Timing-safe comparison. Always completes the full bcrypt work even on
   * trivially mismatched inputs to avoid timing leaks.
   */
  async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Run a real bcrypt compare against a known-invalid sentinel so bcrypt
   * performs the full 2^cost rounds. Call this when the user is not found,
   * so attackers cannot distinguish "user not found" from "wrong password"
   * via timing side-channel.
   */
  async dummyCompare(): Promise<void> {
    // Result is always false — we only care about the CPU time spent.
    await bcrypt.compare('__not_the_real_password__', this.dummyHash);
  }
}
