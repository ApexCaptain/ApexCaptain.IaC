import Joi from '@hapi/joi';

export const WorkstationSchema = Joi.object({
  k8s: Joi.object({
    certificateAuthorityData: Joi.string().required(),
    clientCertificateData: Joi.string().required(),
    clientKeyData: Joi.string().required(),
    server: Joi.string().required(),
  }).required(),
  common: Joi.object({
    defaultCalcioIpv4IpPoolsCidrBlock: Joi.string().required(),
    nordLynxPrivateKey: Joi.string().required(),
    workstationIpv4Ip: Joi.string().required(),
    domain: Joi.object({
      iptime: Joi.string().required(),
    }).required(),
  }).required(),
  devPods: Joi.object({
    kubeConfigDirPath: Joi.string().required(),
  }).required(),
  apps: Joi.object({
    metallb: Joi.object({
      loadbalancerIpRange: Joi.string().required(),
      istioCrossNetworkGatewayIp: Joi.string().required(),
      ingressControllerIp: Joi.string().required(),
    }).required(),
    coder: Joi.object({
      adminUser: Joi.object({
        username: Joi.string().required(),
        fullName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        tokenName: Joi.string().required(),
        refreshTokenBeforeExpirationHours: Joi.number().required(),
        storedTokenSecretFileName: Joi.string().required(),
      }).required(),
      users: Joi.object({
        apexCaptain: Joi.object({
          username: Joi.string().required(),
          email: Joi.string().email().required(),
        }).required(),
      }).required(),
      githubOauth2: Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
      }).required(),
      templateAssetsRelativeDirPath: Joi.string().required(),
    }).required(),
    longhorn: Joi.object({
      nodes: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            disks: Joi.array()
              .items(
                Joi.object({
                  name: Joi.string().required(),
                  path: Joi.string().required(),
                  diskType: Joi.string().required(),
                  isSsd: Joi.boolean().required(),
                }),
              )
              .required(),
          }).required(),
        )
        .required(),
    }).required(),
    game: Joi.object({
      sftp: Joi.object({
        userName: Joi.string().required(),
      }).required(),
      sdtd: Joi.object({
        settings: Joi.object({
          serverPassword: Joi.string().required(),
        }).required(),
      }).required(),
    }).required(),
    nas: Joi.object({
      sftp: Joi.object({
        userName: Joi.string().required(),
      }).required(),
    }).required(),
    windows: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required(),
    wink: Joi.object({
      userName: Joi.string().required(),
    }).required(),
  }).required(),
  nodeMeta: Joi.object({
    node0: Joi.object({
      name: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
