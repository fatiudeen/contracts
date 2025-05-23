import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

async function main() {
  // Read deployment addresses
  const deploymentsPath = path.join(
    __dirname,
    "deployed_addresses_arbitrum.json"
  );
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  // Create package directory
  const packageDir = path.join(__dirname, "../package");
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir);
  }

  // Create package.json for the package directory
  const packageJsonForBuild = {
    name: "@decleanup/contracts",
    version: process.env.npm_package_version || "1.0.0",
    description: "DeCleanup Network Smart Contracts",
    main: "index.js",
    types: "index.d.ts",
    files: ["*.js", "*.d.ts", "artifacts/**/*.json", "typechain/**/*"],
    repository: {
      type: "git",
      url: "git+https://github.com/decleanup/DeCleanup_Network.git",
    },
    keywords: ["ethereum", "arbitrum", "smart-contracts"],
    author: "DeCleanup Network",
    license: "MIT",
    bugs: {
      url: "https://github.com/decleanup/DeCleanup_Network/issues",
    },
    homepage: "https://github.com/decleanup/DeCleanup_Network#readme",
    dependencies: {
      ethers: "^5.7.2",
    },
  };

  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify(packageJsonForBuild, null, 2)
  );

  // Copy TypeChain types
  const typechainDir = path.join(__dirname, "../typechain-types");
  const packageTypechainDir = path.join(packageDir, "typechain");
  if (!fs.existsSync(packageTypechainDir)) {
    fs.mkdirSync(packageTypechainDir, { recursive: true });
  }

  // Copy all TypeChain files
  const copyTypechainFiles = (src: string, dest: string) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyTypechainFiles(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyTypechainFiles(typechainDir, packageTypechainDir);

  const contracts = [
    { name: "DCUToken", path: "tokens/DCUToken.sol" },
    { name: "RewardLogic", path: "RewardLogic.sol" },
    { name: "DCUAccounting", path: "DCUAccounting.sol" },
    { name: "DCUStorage", path: "DCUStorage.sol" },
    { name: "DCURewardManager", path: "DCURewardManager.sol" },
    { name: "DipNft", path: "tokens/DipNft.sol" },
  ];

  // Create artifacts directory
  const artifactsDir = path.join(packageDir, "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir);
  }

  // Generate index.js content
  let indexJs = "";

  for (const contract of contracts) {
    const artifactPath = path.join(
      __dirname,
      "../artifacts/contracts",
      contract.path,
      contract.name + ".json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Create contract-specific files
    const contractDir = path.join(packageDir, "artifacts", contract.name);
    if (!fs.existsSync(contractDir)) {
      fs.mkdirSync(contractDir, { recursive: true });
    }

    // Save ABI
    fs.writeFileSync(
      path.join(contractDir, "abi.json"),
      JSON.stringify(artifact.abi, null, 2)
    );

    // Save bytecode
    fs.writeFileSync(
      path.join(contractDir, "bytecode.json"),
      JSON.stringify({ bytecode: artifact.bytecode }, null, 2)
    );

    // Add to index.js
    indexJs += `const ${contract.name}Type = require('./typechain/types/${contract.name}').${contract.name};\n`;
    indexJs += `exports.${contract.name} = {\n`;
    indexJs += `  address: '${deployments[contract.name]}',\n`;
    indexJs += `  abi: require('./artifacts/${contract.name}/abi.json'),\n`;
    indexJs += `  bytecode: require('./artifacts/${contract.name}/bytecode.json').bytecode,\n`;
    indexJs += `  network: '${deployments.network}',\n`;
    indexJs += `  chainId: ${deployments.chainId},\n`;
    indexJs += `  contract: ${contract.name}Type\n`;
    indexJs += `};\n\n`;
  }

  // Add network info
  indexJs += `exports.network = {\n`;
  indexJs += `  name: '${deployments.network}',\n`;
  indexJs += `  chainId: ${deployments.chainId},\n`;
  indexJs += `  deployedAt: '${deployments.deployedAt}'\n`;
  indexJs += `};\n`;

  // Write index.js
  fs.writeFileSync(path.join(packageDir, "index.js"), indexJs);

  console.log("Package generated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
