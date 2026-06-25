import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("user_roles")
export class UserRole {
  @PrimaryColumn({ type: "varchar", length: 255 })
  userId: string; // Kratos identity ID

  @Column({ type: "varchar", length: 50, default: "app_user" })
  appRole: "app_admin" | "app_user";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
