import { imageStoreContract, ownerAuthContract } from "./contracts";
import { makeImageStoreFake, makeOwnerAuthFake } from "./fakes";

ownerAuthContract(makeOwnerAuthFake);
imageStoreContract(makeImageStoreFake);
