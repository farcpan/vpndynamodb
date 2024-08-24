import { CfnOutput, Fn, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc, SubnetType, IpAddresses } from "aws-cdk-lib/aws-ec2";
import {
  CfnEIPAssociation,
  MachineImage,
  Instance,
  InstanceClass,
  InstanceType,
  InstanceSize,
  Peer,
  Port,
  SecurityGroup,
  UserData,
} from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

interface ClientStackProps extends StackProps {
  eip: string;
  customerGatewayIp: string;
  psk: string;
}

export class ClientStack extends Stack {
  constructor(scope: Construct, id: string, props: ClientStackProps) {
    super(scope, id, props);

    // VPC: 1AZ, Public
    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 1,
      ipAddresses: IpAddresses.cidr("10.2.0.0/16"),
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          name: "PublicEc2Subnet",
          cidrMask: 24,
        },
      ],
    });

    // EC2
    /// EC2インスタンスのセキュリティグループ
    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "Allow SSH access"
    );
    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.udp(500),
      "Allow IPSec VPN"
    );
    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.udp(4500),
      "Allow IPSec VPN"
    );

    /// EC2インスタンスのロール
    const role = new Role(this, "InstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    // @FIXME: DynamoDB Policy is required

    /// インスタンス
    const instance = new Instance(this, "MyInstance", {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2(),
      securityGroup,
      role,
      userData: this.getUserData(props.customerGatewayIp, props.psk),
    });

    /// インスタンスにEIPをアタッチ
    new CfnEIPAssociation(this, "EIPAssociation", {
      eip: props.eip,
      instanceId: instance.instanceId,
    });
  }

  /**
   * EC2 UserData定義
   */
  private getUserData = (
    customerGatewayIp: string,
    preSharedKey: string
  ): UserData => {
    const userData = UserData.forLinux();

    // Update and install libreswan
    userData.addCommands(
      "yum update -y",
      "amazon-linux-extras install epel -y",
      "yum install libreswan -y",

      // Example VPN configuration (this needs to be customized based on your VPN server details)
      `cat <<EOF > /etc/ipsec.conf
    config setup
      protostack=netkey
      uniqueids=no
    
    conn myvpn
      auto=start
      left=%defaultroute
      right=${customerGatewayIp}
      rightid=@myvpnserver
      type=tunnel
      authby=secret
      ike=aes256-sha2;modp1024
      phase2alg=aes256-sha2;modp1024
      leftsubnet=0.0.0.0/0
      rightsubnet=0.0.0.0/0
    EOF`,

      // Example IPsec secrets file (this needs to be customized)
      `cat <<EOF > /etc/ipsec.secrets
    ${customerGatewayIp} %any: PSK ${preSharedKey}
    EOF`,

      // Restart libreswan to apply changes
      "systemctl restart ipsec"
    );

    return userData;
  };
}
