import { ThirdwebSDK } from "@thirdweb-dev/sdk";

import dotenv from "dotenv";
dotenv.config();

(async () => {
  const sdk = ThirdwebSDK.fromPrivateKey(
    // Learn more about securely accessing your private key: https://portal.thirdweb.com/sdk/set-up-the-sdk/securing-your-private-key
    "<your-private-key>",
    "goerli"
  );

  const contract = await sdk.getContract(
    // Update to use your smart contract address
    "<your-contract-address-here>"
  );

  /* 
    lazy-mint 100 tokens
  
    note: Here the base-URI should point to your deployed API URL,
    e.g. - "https://<your-deployment-url>/metadata/"

    You can use `localhost:8000` for testing metadata locally. 
    However, you'll need a deployed API for displaying on marketplaces.
*/
  const txLazyMint = await contract.call(
    "lazyMint",
    100,
    "http://localhost:8000/metadata/",
    []
  );

  console.log(txLazyMint);
})();
