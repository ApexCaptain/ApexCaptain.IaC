import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export interface CephBlockPoolConfig {
  metadata: {
    /** 풀 이름 */
    name: string;
    /** 네임스페이스 */
    namespace: string;
  };
  spec: {
    /** 장애 도메인 (host, osd, rack 등) */
    failureDomain?: string;
    /** 복제 설정 */
    replicated?: {
      /** 복제 수 */
      size: number;
      /** 안전한 복제 크기 요구 여부 */
      requireSafeReplicaSize?: boolean;
      /** 하이브리드 스토리지 설정 */
      hybridStorage?: {
        /** 주 디바이스 클래스 */
        primaryDeviceClass: string;
        /** 보조 디바이스 클래스 */
        secondaryDeviceClass: string;
      };
      /** 장애 도메인당 복제본 수 */
      replicasPerFailureDomain?: number;
      /** 하위 장애 도메인 */
      subFailureDomain?: string;
    };
    /** CRUSH 루트 */
    crushRoot?: string;
    /** 디바이스 클래스 */
    deviceClass?: string;
    /** CRUSH 업데이트 허용 여부 */
    enableCrushUpdates?: boolean;
    /** RBD 통계 활성화 여부 */
    enableRBDStats?: boolean;
    /** 압축 설정 */
    parameters?: {
      /** 압축 모드 */
      compression_mode: string;
      /** 대상 크기 비율 */
      target_size_ratio?: string;
    };
    /** 미러링 설정 */
    mirroring?: {
      /** 미러링 활성화 여부 */
      enabled: boolean;
      /** 미러링 모드 (pool/image) */
      mode?: 'pool' | 'image';
      /** 스냅샷 스케줄 */
      snapshotSchedules?: {
        /** 간격 */
        interval: string;
        /** 시작 시간 */
        startTime: string;
      }[];
    };
    /** 상태 체크 설정 */
    statusCheck?: {
      /** 미러링 상태 체크 */
      mirror?: {
        /** 비활성화 여부 */
        disabled: boolean;
        /** 체크 간격 */
        interval: string;
      };
    };
    /** 할당량 설정 */
    quotas?: {
      /** 최대 크기 */
      maxSize?: string;
      /** 최대 객체 수 */
      maxObjects?: number;
    };
  };
}

export class CephBlockPool extends Manifest {
  constructor(scope: Construct, id: string, props: CephBlockPoolConfig) {
    super(scope, id, {
      manifest: {
        apiVersion: 'ceph.rook.io/v1',
        kind: 'CephBlockPool',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
