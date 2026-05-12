import hre from "hardhat";

async function main() {
    const MedicalRegistry = await hre.ethers.getContractFactory("MedicalRegistry");
    const registry = await MedicalRegistry.deploy();

    await registry.waitForDeployment();

    console.log(`MedicalRegistry deployed to ${registry.target}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
