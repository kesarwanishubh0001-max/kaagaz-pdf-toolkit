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
}

export const ToolIcon: React.FC<ToolIconProps> = ({
  name,
  className = 'w-5 h-5',
}) => {
  switch (name) {
    case 'Layers':
      return <Layers className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Trash2':
      return <Trash2 className={className} />;
    case 'FileOutput':
      return <FileOutput className={className} />;
    case 'LayoutGrid':
      return <LayoutGrid className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Minimize2':
      return <Minimize2 className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'ScanText':
      return <ScanText className={className} />;
    case 'Image':
      return <Image className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Presentation':
      return <Presentation className={className} />;
    case 'Table':
      return <Table className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'FileCode':
      return <FileCode className={className} />;
    case 'FileImage':
      return <FileImage className={className} />;
    case 'Images':
      return <Images className={className} />;
    case 'FileType':
      return <FileType className={className} />;
    case 'MonitorPlay':
      return <MonitorPlay className={className} />;
    case 'Sheet':
      return <Sheet className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'RotateCw':
      return <RotateCw className={className} />;
    case 'Hash':
      return <Hash className={className} />;
    case 'Stamp':
      return <Stamp className={className} />;
    case 'Crop':
      return <Crop className={className} />;
    case 'PenLine':
      return <PenLine className={className} />;
    case 'Unlock':
      return <Unlock className={className} />;
    case 'Lock':
      return <Lock className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'EyeOff':
      return <EyeOff className={className} />;
    case 'GitCompare':
      return <GitCompare className={className} />;
    case 'Layers2':
      return <Layers2 className={className} />;
    case 'Workflow':
      return <Workflow className={className} />;
  }
};
