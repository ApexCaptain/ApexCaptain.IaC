resource "kubernetes_persistent_volume_claim_v1" "home" {
  metadata {
    name      = "coder-${data.coder_workspace.me.id}-home"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"     = "coder-home-pvc"
      "app.kubernetes.io/instance" = "coder-home-pvc-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      //Coder-specific labels.
      "com.coder.resource"       = "true"
      "com.coder.workspace.id"   = data.coder_workspace.me.id
      "com.coder.workspace.name" = data.coder_workspace.me.name
      "com.coder.user.id"        = data.coder_workspace_owner.me.id
      "com.coder.user.username"  = data.coder_workspace_owner.me.name
    }
    annotations = {
      "com.coder.user.email" = data.coder_workspace_owner.me.email
    }
  }
  wait_until_bound = false
  spec {
    storage_class_name = var.storage_class_name
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "${data.coder_parameter.home_disk_size.value}Gi"
      }
    }
  }
}

resource "kubernetes_persistent_volume_claim_v1" "docker" {
  metadata {
    name      = "coder-${data.coder_workspace.me.id}-docker"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"     = "coder-docker-pvc"
      "app.kubernetes.io/instance" = "coder-docker-pvc-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      //Coder-specific labels.
      "com.coder.resource"       = "true"
      "com.coder.workspace.id"   = data.coder_workspace.me.id
      "com.coder.workspace.name" = data.coder_workspace.me.name
      "com.coder.user.id"        = data.coder_workspace_owner.me.id
      "com.coder.user.username"  = data.coder_workspace_owner.me.name
    }
    annotations = {
      "com.coder.user.email" = data.coder_workspace_owner.me.email
    }
  }
  wait_until_bound = false
  spec {
    storage_class_name = var.storage_class_name
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "${data.coder_parameter.docker_disk_size.value}Gi"
      }
    }
  }
}

resource "kubernetes_config_map_v1" "docker_daemon_json" {
  count = data.coder_workspace.me.start_count
  metadata {
    name = "coder-${data.coder_workspace.me.id}-docker-daemon-json"
    namespace = var.namespace
  }
  data = {
    "daemon.json" = <<-EOT
      {
        "mtu": 1400,
        "default-network-opts": {
          "bridge": {
            "com.docker.network.driver.mtu": "1400"
          }
        }
      }
    EOT
  }
}

resource "kubernetes_service_v1" "proxy" {
  count = data.coder_workspace.me.start_count
  metadata {
    name = "coder-${data.coder_workspace.me.id}-proxy"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"     = "coder-workspace-proxy-svc"
      "app.kubernetes.io/instance" = "coder-workspace-proxy-svc-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      "com.coder.resource"         = "true"
      "com.coder.workspace.id"     = data.coder_workspace.me.id
      "com.coder.workspace.name"   = data.coder_workspace.me.name
      "com.coder.user.id"          = data.coder_workspace_owner.me.id
      "com.coder.user.username"    = data.coder_workspace_owner.me.name
    }
  }
  spec {
    selector = {
      "app.kubernetes.io/name"     = "coder-workspace-proxy"
      "app.kubernetes.io/instance" = "coder-workspace-proxy-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      "com.coder.resource"         = "true"
      "com.coder.workspace.id"     = data.coder_workspace.me.id
      "com.coder.workspace.name"   = data.coder_workspace.me.name
      "com.coder.user.id"          = data.coder_workspace_owner.me.id
      "com.coder.user.username"    = data.coder_workspace_owner.me.name
    }
    port {
      name = "proxy"
      port = var.socks5_proxy_port
      target_port = var.socks5_proxy_port
      protocol = "TCP"
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_deployment_v1" "proxy" {
  count = data.coder_workspace.me.start_count
  wait_for_rollout = false
  metadata {
    name      = "coder-${data.coder_workspace.me.id}-proxy"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"     = "coder-workspace-proxy"
      "app.kubernetes.io/instance" = "coder-workspace-proxy-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      "com.coder.resource"         = "true"
      "com.coder.workspace.id"     = data.coder_workspace.me.id
      "com.coder.workspace.name"   = data.coder_workspace.me.name
      "com.coder.user.id"          = data.coder_workspace_owner.me.id
      "com.coder.user.username"    = data.coder_workspace_owner.me.name
    }
    annotations = {
      "com.coder.user.email" = data.coder_workspace_owner.me.email
    }
  }

  spec {
    replicas = 2
    selector {
      match_labels = {
        "app.kubernetes.io/name"     = "coder-workspace-proxy"
        "app.kubernetes.io/instance" = "coder-workspace-proxy-${data.coder_workspace.me.id}"
        "app.kubernetes.io/part-of"  = "coder"
        "com.coder.resource"         = "true"
        "com.coder.workspace.id"     = data.coder_workspace.me.id
        "com.coder.workspace.name"   = data.coder_workspace.me.name
        "com.coder.user.id"          = data.coder_workspace_owner.me.id
        "com.coder.user.username"    = data.coder_workspace_owner.me.name
      }
    }
    strategy {
      type = "Recreate"
    }

    template {
      metadata {
        annotations = {
          "traffic.sidecar.istio.io/excludeInboundPorts" = var.socks5_proxy_port
        }
        labels = {
          "app.kubernetes.io/name"     = "coder-workspace-proxy"
          "app.kubernetes.io/instance" = "coder-workspace-proxy-${data.coder_workspace.me.id}"
          "app.kubernetes.io/part-of"  = "coder"
          "com.coder.resource"         = "true"
          "com.coder.workspace.id"     = data.coder_workspace.me.id
          "com.coder.workspace.name"   = data.coder_workspace.me.name
          "com.coder.user.id"          = data.coder_workspace_owner.me.id
          "com.coder.user.username"    = data.coder_workspace_owner.me.name
          "sidecar.istio.io/inject"    = "true"
        }
      }
      spec {
        enable_service_links = false
        container {
          name              = "proxy"
          image             = "alpine"
          image_pull_policy = "Always"
          command = [
            "sh",
            "-c",
            <<-EOT
              while ! command -v sshd > /dev/null 2>&1; do
                  echo "Installing APK Packages..."
                  apk add --no-cache openssh curl
                  if [ $? -eq 0 ]; then
                      echo "SSH installed successfully."
                      mkdir -p /root/.ssh && chmod 700 /root/.ssh
                      ssh-keygen -t rsa -b 2048 -f /root/.ssh/id_rsa -N ''
                      cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys
                      chmod 600 /root/.ssh/authorized_keys
                      ls -al /root/.ssh
                      ssh-keygen -A
                      break
                  else
                      echo "Failed to install APK Packages. Retrying in 5 seconds..."
                      sleep 5
                  fi
              done

              sed -i 's/^AllowTcpForwarding no$/AllowTcpForwarding yes/' /etc/ssh/sshd_config
              if ! grep -q '^AllowTcpForwarding yes$' /etc/ssh/sshd_config; then
                printf '\nAllowTcpForwarding yes\n' >> /etc/ssh/sshd_config
              fi

              if ! grep -q '^PermitOpen any$' /etc/ssh/sshd_config; then
                printf 'PermitOpen any\n' >> /etc/ssh/sshd_config
              fi

              /usr/sbin/sshd


              while ! nc -z localhost 22; do   
                echo "Waiting for SSH to be available on port 22..."
                sleep 5
              done

              echo "Starting SSH tunnel..."
              ssh -g \
                -o GatewayPorts=yes \
                -o ExitOnForwardFailure=yes \
                -o StrictHostKeyChecking=no \
                -N -D 0.0.0.0:${var.socks5_proxy_port} root@localhost
            EOT
          ]
          liveness_probe {
            exec {
              command = [
                "sh",
                "-c",
                "curl --socks5 localhost:${var.socks5_proxy_port} google.com",
              ]
            }
            failure_threshold = 3
            initial_delay_seconds = 120
            period_seconds = 15
            success_threshold = 1
            timeout_seconds = 5
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "main" {
  count = data.coder_workspace.me.start_count
  metadata {
    name = "coder-${data.coder_workspace.me.id}"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"     = "coder-workspace-svc"
      "app.kubernetes.io/instance" = "coder-workspace-svc-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      "com.coder.resource"         = "true"
      "com.coder.workspace.id"     = data.coder_workspace.me.id
      "com.coder.workspace.name"   = data.coder_workspace.me.name
      "com.coder.user.id"          = data.coder_workspace_owner.me.id
      "com.coder.user.username"    = data.coder_workspace_owner.me.name
    }
  }
  spec {
    selector = {
      "app.kubernetes.io/name"     = "coder-workspace"
      "app.kubernetes.io/instance" = "coder-workspace-${data.coder_workspace.me.id}"
      "app.kubernetes.io/part-of"  = "coder"
      "com.coder.resource"         = "true"
      "com.coder.workspace.id"     = data.coder_workspace.me.id
      "com.coder.workspace.name"   = data.coder_workspace.me.name
      "com.coder.user.id"          = data.coder_workspace_owner.me.id
      "com.coder.user.username"    = data.coder_workspace_owner.me.name
    }
    cluster_ip = "None"
  }
}

resource "kubernetes_manifest" "main" {
  count = data.coder_workspace.me.start_count
  manifest = {
    apiVersion = "apps/v1"
    kind = "Deployment"
    metadata = {
      name = "coder-${data.coder_workspace.me.id}"
      namespace = var.namespace
      annotations = {
        "com.coder.user.email" = data.coder_workspace_owner.me.email
      }
      labels = {
        "app.kubernetes.io/name"     = "coder-workspace"
        "app.kubernetes.io/instance" = "coder-workspace-${data.coder_workspace.me.id}"
        "app.kubernetes.io/part-of"  = "coder"
        "com.coder.resource"         = "true"
        "com.coder.workspace.id"     = data.coder_workspace.me.id
        "com.coder.workspace.name"   = data.coder_workspace.me.name
        "com.coder.user.id"          = data.coder_workspace_owner.me.id
        "com.coder.user.username"    = data.coder_workspace_owner.me.name
      }
    }
    spec = {
      replicas = 1
      selector = {
        matchLabels = {
          "app.kubernetes.io/name"     = "coder-workspace"
          "app.kubernetes.io/instance" = "coder-workspace-${data.coder_workspace.me.id}"
          "app.kubernetes.io/part-of"  = "coder"
          "com.coder.resource"         = "true"
          "com.coder.workspace.id"     = data.coder_workspace.me.id
          "com.coder.workspace.name"   = data.coder_workspace.me.name
          "com.coder.user.id"          = data.coder_workspace_owner.me.id
          "com.coder.user.username"    = data.coder_workspace_owner.me.name
        }
      }
      strategy = {
        type = "Recreate"
      }
      template = {
        metadata = {
          labels = {
            "app.kubernetes.io/name"     = "coder-workspace"
            "app.kubernetes.io/instance" = "coder-workspace-${data.coder_workspace.me.id}"
            "app.kubernetes.io/part-of"  = "coder"
            "com.coder.resource"         = "true"
            "com.coder.workspace.id"     = data.coder_workspace.me.id
            "com.coder.workspace.name"   = data.coder_workspace.me.name
            "com.coder.user.id"          = data.coder_workspace_owner.me.id
            "com.coder.user.username"    = data.coder_workspace_owner.me.name
            "sidecar.istio.io/inject"    = "false"
          }
        }
        spec = {
          runtimeClassName = var.runtime_class_name
          hostUsers = false
          enableServiceLinks = false
          securityContext = {
            runAsUser = 1000
            runAsNonRoot = false
          }
          hostname = "sysbox-ubuntu"
          initContainers = [
            {
              name = "setup-home-directory"
              image = "busybox"
              command = ["sh", "-c", "chown -R 1000:1000 /home/coder"]
              securityContext = {
                runAsUser = 0
              }
              volumeMounts = [
                {
                  name = "home"
                  mountPath = "/home/coder"
                }
              ]
            }
          ],
          containers = [
            {
              name = "dev"
              image = "codercom/enterprise-base:ubuntu"
              imagePullPolicy = "Always"
              command = [
                "sh",
                 "-c",
                 <<-EOT
                  # Ubuntu 기본 Mirror 설정을 Kakao로 변경; @ToDO 추후 사용자 환경에 맞게 변경 필요
                  sudo sed -i 's/kr.archive.ubuntu.com/mirror.kakao.com/g' /etc/apt/sources.list
                  sudo sed -i 's|http://archive.ubuntu.com|http://mirror.kakao.com|g' /etc/apt/sources.list.d/ubuntu.sources
                  sudo sed -i 's|http://security.ubuntu.com|http://mirror.kakao.com|g' /etc/apt/sources.list.d/ubuntu.sources
                  sudo apt-get update -y
                  ${coder_agent.main.init_script}
                 EOT
                 
              ]
              securityContext = {
                runAsUser = 1000
              }
              env = [
                {
                  name = "TZ",
                  value = "Asia/Seoul"
                },
                {
                  name = "CODER_AGENT_TOKEN"
                  value = coder_agent.main.token
                },
                {
                  name = "CODER_WORKSPACE_SERVICE_DOMAIN"
                  value = "${kubernetes_service_v1.main[count.index].metadata[0].name}.${var.namespace}.svc.cluster.local"
                },
                {
                  name = "CODER_ISTIO_PROXY_HOST"
                  value = kubernetes_service_v1.proxy[count.index].metadata[0].name
                },
                {
                  name = "CODER_ISTIO_PROXY_PORT"
                  value = kubernetes_service_v1.proxy[count.index].spec[0].port[0].port
                }
              ]
              resources = {
                requests = {
                  cpu = "250m"
                  memory = "512Mi"
                }
                limits = {
                  cpu = "${data.coder_parameter.cpu.value}"
                  memory = "${data.coder_parameter.memory.value}Gi"
                  "${var.device_plugin_fuse_key}" = data.coder_parameter.fuse_count.value
                }
              }
              volumeMounts = [
                // User Data
                {
                  name = "home"
                  mountPath = "/home/coder"
                },
                // Docker Data
                {
                  name = "docker"
                  mountPath = "/var/lib/docker"
                },
                // Docker Daemon JSON CM
                {
                  name = "docker-daemon-json"
                  mountPath = "/etc/docker/daemon.json"
                  subPath = "daemon.json"
                },
                // LXCFS
                {
                  name = "lxcfs-meminfo"
                  mountPath = "/proc/meminfo"
                  readOnly = true
                },
                {
                  name      = "lxcfs-cpuinfo"
                  mountPath = "/proc/cpuinfo"
                  readOnly  = true
                },
                {
                  name      = "lxcfs-stat"
                  mountPath = "/proc/stat"
                  readOnly  = true
                },
                {
                  name      = "lxcfs-loadavg"
                  mountPath = "/proc/loadavg"
                  readOnly  = true
                },
                {
                  name      = "lxcfs-uptime"
                  mountPath = "/proc/uptime"
                  readOnly  = true
                }
              ]
            },
          ]
          volumes = [
            // User Data
            {
              name = "home"
              persistentVolumeClaim = {
                claimName = kubernetes_persistent_volume_claim_v1.home.metadata[0].name
              }
            },
            // Docker Data
            {
              name = "docker"
              persistentVolumeClaim = {
                claimName = kubernetes_persistent_volume_claim_v1.docker.metadata[0].name
              }
            },
            // Docker Daemon JSON ConfigMap
            {
              name = "docker-daemon-json"
              configMap = {
                name = kubernetes_config_map_v1.docker_daemon_json[count.index].metadata[0].name
                items = [
                  {
                    key = "daemon.json"
                    path = "daemon.json"
                  }
                ]
              }
            },
            // LXCFS
            {
              name = "lxcfs-meminfo",
              hostPath = {
                path = "${var.lxcfs_host_mount_path}/proc/meminfo"
                type = "File"
              }
            },
            {
              name = "lxcfs-cpuinfo"
              hostPath = {
                path = "${var.lxcfs_host_mount_path}/proc/cpuinfo"
                type = "File"
              }
            },
            {
              name = "lxcfs-stat"
              hostPath = {
                path = "${var.lxcfs_host_mount_path}/proc/stat"
                type = "File"
              }
            },
            {
              name = "lxcfs-loadavg"
              hostPath = {
                path = "${var.lxcfs_host_mount_path}/proc/loadavg"
                type = "File"
              }
            },
            {
              name = "lxcfs-uptime"
              hostPath = {
                path = "${var.lxcfs_host_mount_path}/proc/uptime"
                type = "File"
              }
            }
          ]
          affinity = {
            podAntiAffinity = {
              preferredDuringSchedulingIgnoredDuringExecution = [
                {
                  weight = 1
                  podAffinityTerm = {
                    topologyKey = "kubernetes.io/hostname"
                    labelSelector = {
                      matchExpressions = [
                        {
                          key = "app.kubernetes.io/name"
                          operator = "In"
                          values = [
                            "coder-workspace"
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
  depends_on = [ kubernetes_deployment_v1.proxy ]
}