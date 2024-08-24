import { App, CfnOutput } from "aws-cdk-lib";
import { SrcStack } from "../lib/src-stack";
import { ClientStack } from "../lib/client-stack";

const app = new App();

// VPN Connection Preshared Key
/// Allowed characters are alphanumeric characters and ._. Must be between 8 and 64 characters in length and cannot start with zero (0).
const psk = "aaaa0001";

// VPC A
const srcStack = new SrcStack(app, "SrcStack", {
  // 事前共有鍵
  psk: psk,
});

// VPC B
new ClientStack(app, "ClientStack", {
  eip: srcStack.eip,
  customerGatewayIp: "57.182.29.208", // srcStack.customerGatewayIp,
  // 事前共有鍵
  psk: psk,
});
