import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export interface CephClusterConfig {
  metadata: {
    /** 클러스터 이름 */
    name: string;
    /** 네임스페이스 */
    namespace: string;
  };
  spec: {
    /** Ceph 버전 설정 */
    cephVersion?: {
      /** Ceph 이미지 */
      image: string;
      /** 지원되지 않는 버전 허용 여부 */
      allowUnsupported?: boolean;
    };
    /** 호스트의 설정 파일 저장 경로 */
    dataDirHostPath?: string;
    /** 업그레이드 체크 건너뛰기 여부 */
    skipUpgradeChecks?: boolean;
    /** 체크 실패 후에도 업그레이드 계속 여부 */
    continueUpgradeAfterChecksEvenIfNotHealthy?: boolean;
    /** OSD 업그레이드 대기 시간 (분) */
    waitTimeoutForHealthyOSDInMinutes?: number;
    /** OSD 업그레이드 전 PG 상태 체크 여부 */
    upgradeOSDRequiresHealthyPGs?: boolean;
    /** 모니터 설정 */
    mon?: {
      /** 모니터 개수 */
      count: number;
      /** 노드당 여러 모니터 허용 여부 */
      allowMultiplePerNode: boolean;
    };
    /** MGR 설정 */
    mgr?: {
      /** MGR 개수 */
      count?: number;
      /** 노드당 여러 MGR 허용 여부 */
      allowMultiplePerNode?: boolean;
      /** MGR 모듈 설정 */
      modules?: {
        /** 모듈 이름 */
        name: string;
        /** 모듈 활성화 여부 */
        enabled: boolean;
      }[];
    };
    /** 대시보드 설정 */
    dashboard?: {
      /** 대시보드 활성화 여부 */
      enabled: boolean;
      /** URL 접두사 */
      urlPrefix?: string;
      /** 포트 */
      port?: number;
      /** SSL 사용 여부 */
      ssl?: boolean;
      /** Prometheus 엔드포인트 */
      prometheusEndpoint?: string;
      /** Prometheus SSL 검증 여부 */
      prometheusEndpointSSLVerify?: boolean;
    };
    /** 모니터링 설정 */
    monitoring?: {
      /** 모니터링 활성화 여부 */
      enabled: boolean;
      /** 메트릭 비활성화 여부 */
      metricsDisabled?: boolean;
      /** Ceph exporter 설정 */
      exporter?: {
        /** 성능 카운터 우선순위 제한 */
        perfCountersPrioLimit?: number;
        /** 통계 수집 주기 (초) */
        statsPeriodSeconds?: number;
      };
    };
    /** 네트워크 설정 */
    network?: {
      /** 암호화 설정 */
      encryption?: {
        /** 암호화 활성화 여부 */
        enabled: boolean;
      };
      /** 압축 설정 */
      compression?: {
        /** 압축 활성화 여부 */
        enabled: boolean;
      };
      /** msgr2 요구 여부 */
      requireMsgr2?: boolean;
      /** 네트워크 프로바이더 */
      provider?: 'host' | 'multus';
      /** Multus 선택자 */
      selectors?: {
        /** 공개 네트워크 선택자 */
        public?: string;
        /** 클러스터 네트워크 선택자 */
        cluster?: string;
      };
      /** IP 버전 */
      ipFamily?: string;
    };
    /** 크래시 수집기 설정 */
    crashCollector?: {
      /** 비활성화 여부 */
      disable?: boolean;
      /** 보관 기간 (일) */
      daysToRetain?: number;
    };
    /** 로그 수집기 설정 */
    logCollector?: {
      /** 활성화 여부 */
      enabled: boolean;
      /** 수집 주기 */
      periodicity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
      /** 최대 로그 크기 */
      maxLogSize?: string;
    };
    /** 정리 정책 설정 */
    cleanupPolicy?: {
      /** 확인 */
      confirmation?: string;
      /** 디스크 정리 설정 */
      sanitizeDisks?: {
        /** 정리 방법 */
        method?: 'complete' | 'quick';
        /** 데이터 소스 */
        dataSource?: 'zero' | 'random';
        /** 반복 횟수 */
        iteration?: number;
      };
      /** 볼륨이 있는 상태에서 제거 허용 여부 */
      allowUninstallWithVolumes?: boolean;
    };
    /** 배치 설정 */
    placement?: {
      /** 모든 컴포넌트 */
      all?: {
        /** 노드 선호도 */
        nodeAffinity?: {
          requiredDuringSchedulingIgnoredDuringExecution?: {
            nodeSelectorTerms?: {
              matchExpressions?: {
                key: string;
                operator: string;
                values: string[];
              }[];
            }[];
          };
        };
        /** Pod 선호도 */
        podAffinity?: any;
        /** Pod 반선호도 */
        podAntiAffinity?: any;
        /** 토폴로지 분산 제약 */
        topologySpreadConstraints?: any;
        /** 허용 */
        tolerations?: {
          key: string;
          operator: string;
          value?: string;
          effect?: string;
        }[];
      };
      /** 모니터 */
      mon?: any;
      /** OSD */
      osd?: any;
      /** MGR */
      mgr?: any;
      /** 정리 */
      cleanup?: any;
    };
    /** 어노테이션 설정 */
    annotations?: {
      /** 모든 컴포넌트 */
      all?: Record<string, string>;
      /** 모니터 */
      mon?: Record<string, string>;
      /** MGR */
      mgr?: Record<string, string>;
      /** OSD */
      osd?: Record<string, string>;
      /** 익스포터 */
      exporter?: Record<string, string>;
      /** 크래시 수집기 */
      crashcollector?: Record<string, string>;
      /** 정리 */
      cleanup?: Record<string, string>;
      /** OSD 준비 */
      prepareosd?: Record<string, string>;
      /** 명령어 리포터 */
      cmdreporter?: Record<string, string>;
      /** 클러스터 메타데이터 */
      clusterMetadata?: Record<string, string>;
    };
    /** 레이블 설정 */
    labels?: {
      /** 모든 컴포넌트 */
      all?: Record<string, string>;
      /** 모니터 */
      mon?: Record<string, string>;
      /** OSD */
      osd?: Record<string, string>;
      /** 정리 */
      cleanup?: Record<string, string>;
      /** MGR */
      mgr?: Record<string, string>;
      /** OSD 준비 */
      prepareosd?: Record<string, string>;
      /** 익스포터 */
      exporter?: Record<string, string>;
      /** 모니터링 */
      monitoring?: Record<string, string>;
      /** 크래시 수집기 */
      crashcollector?: Record<string, string>;
    };
    /** 리소스 설정 */
    resources?: {
      /** MGR */
      mgr?: {
        limits?: {
          memory?: string;
        };
        requests?: {
          cpu?: string;
          memory?: string;
        };
      };
      /** 모니터 */
      mon?: {
        limits?: {
          memory?: string;
        };
        requests?: {
          cpu?: string;
          memory?: string;
        };
      };
      /** OSD */
      osd?: {
        limits?: {
          memory?: string;
        };
        requests?: {
          cpu?: string;
          memory?: string;
        };
      };
      /** OSD 준비 */
      prepareosd?: any;
      /** MGR 사이드카 */
      mgrSidecar?: any;
      /** 크래시 수집기 */
      crashcollector?: any;
      /** 로그 수집기 */
      logcollector?: any;
      /** 정리 */
      cleanup?: any;
      /** 익스포터 */
      exporter?: any;
      /** 명령어 리포터 */
      cmdReporter?: any;
    };
    /** OSD 제거 설정 */
    removeOSDsIfOutAndSafeToRemove?: boolean;
    /** 우선순위 클래스 이름 */
    priorityClassNames?: {
      /** 모든 컴포넌트 */
      all?: string;
      /** 모니터 */
      mon?: string;
      /** OSD */
      osd?: string;
      /** MGR */
      mgr?: string;
      /** 크래시 수집기 */
      crashcollector?: string;
    };
    /** 스토리지 설정 */
    storage?: {
      /** 모든 노드 사용 여부 */
      useAllNodes: boolean;
      /** 모든 디바이스 사용 여부 */
      useAllDevices: boolean;
      /** 디바이스 필터 */
      deviceFilter?: string;
      /** 기본 설정 */
      config?: {
        /** CRUSH 루트 */
        crushRoot?: string;
        /** 메타데이터 디바이스 */
        metadataDevice?: string;
        /** 데이터베이스 크기 (MB) */
        databaseSizeMB?: string;
        /** 디바이스당 OSD 수 */
        osdsPerDevice?: string;
        /** 디바이스 암호화 여부 */
        encryptedDevice?: string;
        /** 디바이스 클래스 */
        deviceClass?: string;
      };
      /** 디바이스 클래스 업데이트 허용 여부 */
      allowDeviceClassUpdate?: boolean;
      /** OSD CRUSH 가중치 업데이트 허용 여부 */
      allowOsdCrushWeightUpdate?: boolean;
      /** 노드별 설정 */
      nodes?: {
        /** 노드 이름 */
        name: string;
        /** 디바이스 설정 */
        devices?: {
          /** 디바이스 경로 */
          name: string;
          /** 디바이스 설정 */
          config?: {
            /** CRUSH 루트 */
            crushRoot?: string;
            /** 메타데이터 디바이스 */
            metadataDevice?: string;
            /** 데이터베이스 크기 (MB) */
            databaseSizeMB?: string;
            /** 디바이스당 OSD 수 */
            osdsPerDevice?: string;
            /** 디바이스 암호화 여부 */
            encryptedDevice?: string;
            /** 디바이스 클래스 */
            deviceClass?: string;
          };
        }[];
        /** 노드별 설정 */
        config?: any;
        /** 디바이스 필터 */
        deviceFilter?: string;
      }[];
      /** 항상 스케줄링 여부 */
      scheduleAlways?: boolean;
      /** OSD 배치만 적용 여부 */
      onlyApplyOSDPlacement?: boolean;
      /** 플래핑 재시작 간격 (시간) */
      flappingRestartIntervalHours?: number;
      /** 전체 비율 */
      fullRatio?: number;
      /** 백필 전체 비율 */
      backfillFullRatio?: number;
      /** 거의 전체 비율 */
      nearFullRatio?: number;
    };
    /** 중단 관리 설정 */
    disruptionManagement?: {
      /** Pod 예산 관리 여부 */
      managePodBudgets?: boolean;
      /** OSD 유지보수 타임아웃 (분) */
      osdMaintenanceTimeout?: number;
    };
    /** CSI 설정 */
    csi?: {
      /** 읽기 선호도 설정 */
      readAffinity?: {
        /** 활성화 여부 */
        enabled: boolean;
      };
      /** CephFS 설정 */
      cephfs?: {
        /** 커널 마운트 옵션 */
        kernelMountOptions?: string;
        /** Fuse 마운트 옵션 */
        fuseMountOptions?: string;
      };
    };
    /** 헬스 체크 설정 */
    healthCheck?: {
      /** 데몬 헬스 체크 설정 */
      daemonHealth?: {
        /** 모니터 헬스 체크 */
        mon?: {
          /** 비활성화 여부 */
          disabled: boolean;
          /** 체크 간격 */
          interval: string;
        };
        /** OSD 헬스 체크 */
        osd?: {
          /** 비활성화 여부 */
          disabled: boolean;
          /** 체크 간격 */
          interval: string;
        };
        /** 상태 체크 */
        status?: {
          /** 비활성화 여부 */
          disabled: boolean;
          /** 체크 간격 */
          interval: string;
        };
      };
      /** 활성 프로브 설정 */
      livenessProbe?: {
        /** 모니터 */
        mon?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
        /** MGR */
        mgr?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
        /** OSD */
        osd?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
      };
      /** 시작 프로브 설정 */
      startupProbe?: {
        /** 모니터 */
        mon?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
        /** MGR */
        mgr?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
        /** OSD */
        osd?: {
          /** 비활성화 여부 */
          disabled: boolean;
        };
      };
    };
  };
}

/**
 * @See https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
 */
export class CephCluster extends Manifest {
  constructor(scope: Construct, id: string, props: CephClusterConfig) {
    super(scope, id, {
      manifest: {
        apiVersion: 'ceph.rook.io/v1',
        kind: 'CephCluster',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
