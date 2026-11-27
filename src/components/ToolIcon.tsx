import React from 'react';
import {
  Layers,
  Scissors,
  Trash2,
  FileOutput,
  LayoutGrid,
  Camera,
  Minimize2,
  Wrench,
  ScanText,
  Image,
  FileText,
  Presentation,
  Table,
  Code2,
  FileCode,
  FileImage,
  Images,
  FileType,
  MonitorPlay,
  Sheet,
  ShieldCheck,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  PenLine,
  Unlock,
  Lock,
  PenTool,
  EyeOff,
  GitCompare,
  Layers2,
  Workflow,
} from 'lucide-react';
import { ToolIconName } from '../data/tools';

interface ToolIconProps {
  name: ToolIconName;
  className?: string;
  strokeWidth?: number;
}

export const ToolIcon: React.FC<ToolIconProps> = ({
  name,
  className = 'w-5 h-5',
  strokeWidth = 1.6,
}) => {
  const props = { className, strokeWidth };

  switch (name) {
    case 'Layers':
      return <Layers {...props} />;
    case 'Scissors':
      return <Scissors {...props} />;
    case 'Trash2':
      return <Trash2 {...props} />;
    case 'FileOutput':
      return <FileOutput {...props} />;
    case 'LayoutGrid':
      return <LayoutGrid {...props} />;
    case 'Camera':
      return <Camera {...props} />;
    case 'Minimize2':
      return <Minimize2 {...props} />;
    case 'Wrench':
      return <Wrench {...props} />;
    case 'ScanText':
      return <ScanText {...props} />;
    case 'Image':
      return <Image {...props} />;
    case 'FileText':
      return <FileText {...props} />;
    case 'Presentation':
      return <Presentation {...props} />;
    case 'Table':
      return <Table {...props} />;
    case 'Code2':
      return <Code2 {...props} />;
    case 'FileCode':
      return <FileCode {...props} />;
    case 'FileImage':
      return <FileImage {...props} />;
    case 'Images':
      return <Images {...props} />;
    case 'FileType':
      return <FileType {...props} />;
    case 'MonitorPlay':
      return <MonitorPlay {...props} />;
    case 'Sheet':
      return <Sheet {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'RotateCw':
      return <RotateCw {...props} />;
    case 'Hash':
      return <Hash {...props} />;
    case 'Stamp':
      return <Stamp {...props} />;
    case 'Crop':
      return <Crop {...props} />;
    case 'PenLine':
      return <PenLine {...props} />;
    case 'Unlock':
      return <Unlock {...props} />;
    case 'Lock':
      return <Lock {...props} />;
    case 'PenTool':
      return <PenTool {...props} />;
    case 'EyeOff':
      return <EyeOff {...props} />;
    case 'GitCompare':
      return <GitCompare {...props} />;
    case 'Layers2':
      return <Layers2 {...props} />;
    case 'Workflow':
      return <Workflow {...props} />;
  }
};
