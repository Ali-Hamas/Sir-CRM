import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateEngineService {
  render(template: string, variables: Record<string, any>, bodyFormat = 'HTML'): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    if (bodyFormat === 'MARKDOWN' || bodyFormat === 'PLAIN_TEXT') {
      return result;
    }
    return result;
  }

  extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }
}
