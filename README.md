# Generative Art NFTs

This template shows you how to create an NFT Collection with a **centralized** server, that generates art based on a unique hash that is generated when an NFT gets minted.

There are two components to this template:

1. The `contract` folder: Stores the smart contract for our NFT collection
2. the `generative-art-server` folder: Stores the code that generates the art for our NFTs, intended to be run on a server.

## Contract Logic

The [Contract.sol](./contract/contracts/Contract.sol) file contains our NFT Drop contract that uses the [ERC721Drop](https://portal.thirdweb.com/contracts-sdk/base-contracts/erc-721/erc721drop) base contract.

The contract contrains a `script` variable to store the logic to generate the art for a given NFT, which gets set in the constructor (when the contract gets deployed).

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@thirdweb-dev/contracts/base/ERC721Drop.sol";

contract MyGenerativeArt is ERC721Drop {
    string public script;             // declare storage variable
    
    function setScript(string calldata _script) onlyOwner public {
        script = _script;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps,
        address _primarySaleRecipient,
		string memory _script          // script input param
    )
        ERC721Drop(
            _name,
            _symbol,
            _royaltyRecipient,
            _royaltyBps,
            _primarySaleRecipient
        )
    {
		script = _script; // initialize script variable
	}
}
```

To generate unique art pieces for each NFT in our collection, we generate a **hash value** for each token ID.

```solidity
// mapping from tokenId to associated hash value
mapping(uint256 => bytes32) public tokenToHash;

// mapping of hash to tokenId
mapping(bytes32 => uint256) public hashToToken;
```

We generate a hash value for an NFT (token ID) as it’s minted.

Each time a user claims an NFT from our drop, a hash will get generated, and subsequently stored in this mapping.

To generate the hash value, we’re using a combination of `tokenId`, `block number`, and the receiver’s `wallet address` to create a unique value for each NFT. Combining these values will be unique every time a new NFT gets minted, which means we’ll be able to use these unique values to generate different images for each NFT based on this hash!

```solidity
// Generative NFT logic
function _mintGenerative(address _to, uint256 _startTokenId, uint256 _qty) internal virtual {
    for(uint256 i = 0; i < _qty; i += 1) {
        uint256 _id = _startTokenId + i;

        // generate hash
        bytes32 mintHash = keccak256(abi.encodePacked(_id, blockhash(block.number - 1), _to));

		// save hash in mappings
        tokenToHash[_id] = mintHash;
        hashToToken[mintHash] = _id;
    }
}
```

In the Drop base contract, tokens are minted inside transferTokensOnClaim function. We need to override its logic to include our art generation:

```solidity
function transferTokensOnClaim(address _to, uint256 _quantityBeingClaimed)
    internal
    virtual
    override
    returns (uint256 startTokenId)
{
    startTokenId = _currentIndex;
	// Call our mintGenerative function here!
    _mintGenerative(_to, startTokenId, _quantityBeingClaimed);
    _safeMint(_to, _quantityBeingClaimed);
}
```

## Server Logic

The `generative-art-server` folder contains the code for a Node.JS server that generates art for our NFTs.

It exposes an endpoint that accepts a token ID:

```js
app.get("/token/:tokenId", async (req, res) => {
  const hash = await getScript(req.params.tokenId);

  if (!tokenImages[`img_${req.params.tokenId}`]) {
    const buf = saveImage(hash, req.params.tokenId);

    // Configure this to the network you deployed your contract to;
    const sdk = new ThirdwebSDK("goerli");

    const result = await sdk.storage.upload(buf);

    tokenImages[`img_${req.params.tokenId}`] = `${result.uris[0]}`;
  }

  res.render("piece", {
    scriptName: `mySketch.js`,
  });
});
```

When a user hits this endpoint, for example, `https://<our-deployed-server-url>/token/1`, the server will generate the art for the NFT with ID `1`.

First, it calls `getScript`, which fetches the `script` variable we set in the contract.

We set this to be the [Artblocks example code](https://github.com/ArtBlocks/artblocks-starter-template/blob/main/public/js/pieces/example.js).

Now we have the JavaScript logic required to generate the unique art for each NFT.

This [getScript](./generative-art-server/controllers/sketches.js) function writes a new file called `mySketch.js` to the `public/js/pieces` folder. This generated script concatenates an object containing the token ID and the hash for that token ID with the `script` variable we set in the contract.

```js
// Configure this to the network you deployed your contract to;
const sdk = new ThirdwebSDK("goerli");

const getScript = async (tokenId) => {
  // Your contract address from the dashboard
  const contract = await sdk.getContract(
    "0x0064B1Cd6f1AC6f8c50D1187D20d9fb489CdDfB6"
  );
  // Get the script from the contract
  const scriptStr = await contract.call("script");
  const hash = await contract.call("tokenToHash", parseInt(tokenId));

  // this string is appended to the script-string fetched from the contract.
  // it provides hash and tokenId as inputs to the script
  const detailsForThisToken = `const tokenData = {
        hash: "${hash}",
        tokenId: ${tokenId}
    }\n
`;

  // Write the details for this token + the script to a file ../public/token/js/pieces/mySketch.js and await the result
  const filePath = path.resolve(
    path.dirname("."),
    "./public/token/js/pieces/mySketch.js"
  );

  // Write the file
  await new Promise((resolve, reject) => {
    fs.writeFile(
      filePath,
      detailsForThisToken + scriptStr.toString(),
      "utf8",
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  return hash;
};
```

Using a combination of [p5.js](https://p5js.org/) and [handlebars.js](https://handlebarsjs.com/), we render the art for a given NFT in the [saveImage](./generative-art-server/controllers/images.js) function, using `p5.createSketch` to render the art.

Each time a new NFT is rendered, we upload it to IPFS using the storage SDK and store that IPFS value as the value for the token ID key in our `tokenImages` object.

```js
const tokenImages = {};

app.get("/token/:tokenId", async (req, res) => {
  const hash = await getScript(req.params.tokenId);

  if (!tokenImages[`img_${req.params.tokenId}`]) {
    const buf = saveImage(hash, req.params.tokenId);

    // Configure this to the network you deployed your contract to;
    const sdk = new ThirdwebSDK("goerli");

    // If this is the first time we've seen this, upload it to IPFS
    const result = await sdk.storage.upload(buf);

    // "Cache" the IPFS value for this token ID so we don't re-render it every time.
    tokenImages[`img_${req.params.tokenId}`] = `${result.uris[0]}`;
  }
});
```

### Deploying the Node.JS Server

You can deploy the `generative-art-server` as a Node.JS server using any cloud tool, such as [Google App Engine](https://cloud.google.com/appengine/).

Learn how to deploy by following this guide: https://cloud.google.com/appengine/docs/standard/nodejs/building-app

### Mapping Metadata to Server Deployment

To have your NFTs show the art generated by the server, their `image` and `animation_url` fields need to point to the endpoint of that token ID.

For example, if you deployed your server to `https://my-server.com/token/1`, your NFTs would have `image` and `animation_url` fields set to `https://my-server.com/token/1`.

This way, when sites such as OpenSea attempt to render your NFTs, they will use the server to generate the art and display it.

**IMPORTANT NOTE:** This is a **centralized** method of generating art for your NFTs, if your server crashes or is unavailable, your NFTs will not show the art generated by the server until it is back up.
