class RealTimeDiffSystem {
    constructor() {
        this.prdSource = '';
        this.devSource = '';
        this.qaSource = '';
        this.stgSource = '';
        this.currentFocus = null; // 현재 포커스된 영역
        this.diffLines = []; // 현재 diff 라인들
        this.currentDiffIndex = -1; // 현재 선택된 차이점 인덱스
        
        this.initializeEventListeners();
        this.updateStats();
    }

    initializeEventListeners() {
        // 텍스트에어리어 이벤트 리스너
        const textareas = ['prdSource', 'devSource', 'qaSource', 'stgSource'];
        textareas.forEach(id => {
            const textarea = document.getElementById(id);
            if (textarea) {
                textarea.addEventListener('input', () => this.handleTextChange(id));
                textarea.addEventListener('paste', () => this.handlePaste(id));
                textarea.addEventListener('click', () => this.handleClick(id));
                console.log('Event listeners added for:', id); // 디버깅용
            } else {
                console.log('Textarea not found:', id); // 디버깅용
            }
        });

        // 토글 버튼
        const toggleBtn = document.getElementById('toggleDiff');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleDiffResults());
        }
    }

    handleTextChange(sourceId) {
        const textarea = document.getElementById(sourceId);
        const value = textarea.value;
        
        // 소스 업데이트
        this[sourceId] = value;
        
        // 통계 업데이트
        this.updateStats();
        
        // 실시간 비교 실행
        this.performRealTimeComparison();
        
        // PRD 소스가 변경되면 모든 소스 상태 업데이트
        if (sourceId === 'prdSource') {
            this.updateAllSourceStatuses();
        }
    }

    handlePaste(sourceId) {
        // 붙여넣기 후 약간의 지연을 두고 처리
        setTimeout(() => {
            this.handleTextChange(sourceId);
        }, 10);
    }

    handleClick(sourceId) {
        console.log('Clicked source:', sourceId); // 디버깅용
        this.setFocus(sourceId);
        
        // 클릭된 소스와 PRD를 즉시 비교
        if (sourceId !== 'prdSource' && this[sourceId].trim()) {
            console.log('Updating comparison with source:', sourceId); // 디버깅용
            this.updateComparisonWithSource(sourceId);
        } else {
            // PRD 소스 클릭 시 모든 소스와 비교
            this.performFocusedComparison();
        }
    }

    setFocus(sourceId) {
        this.currentFocus = sourceId;
        this.updateFocusVisual();
    }

    clearFocus() {
        this.currentFocus = null;
        this.updateFocusVisual();
    }

    updateFocusVisual() {
        // 모든 패널에서 focused 클래스 제거
        const panels = document.querySelectorAll('.source-panel');
        panels.forEach(panel => panel.classList.remove('focused'));

        // 현재 포커스된 패널에 focused 클래스 추가
        if (this.currentFocus) {
            const focusMap = {
                'prdSource': '.prd-panel',
                'devSource': '.dev-panel',
                'qaSource': '.qa-panel',
                'stgSource': '.stg-panel'
            };

            const panelSelector = focusMap[this.currentFocus];
            if (panelSelector) {
                const panel = document.querySelector(panelSelector);
                if (panel) {
                    panel.classList.add('focused');
                }
            }
        }
    }

    updateStats() {
        const sources = [
            { id: 'prdSource', statsId: 'prdStats' },
            { id: 'devSource', statsId: 'devStats', statusId: 'devStatus' },
            { id: 'qaSource', statsId: 'qaStats', statusId: 'qaStatus' },
            { id: 'stgSource', statsId: 'stgStats', statusId: 'stgStatus' }
        ];

        sources.forEach(({ id, statsId, statusId }) => {
            const lines = this[id].split('\n').length;
            document.getElementById(statsId).textContent = `${lines}줄`;
            
            // PRD가 아닌 소스들의 상태 업데이트
            if (statusId && this.prdSource.trim()) {
                this.updateSourceStatus(id, statusId);
            }
        });

        // 전체 비교 결과 업데이트
        this.updateOverallComparison();
    }

    // 소스 상태 업데이트
    updateSourceStatus(sourceId, statusId) {
        const source = this[sourceId];
        const statusElement = document.getElementById(statusId);
        
        if (!source.trim()) {
            statusElement.textContent = '';
            statusElement.className = 'panel-status';
            return;
        }

        const diff = this.calculateDiff(this.prdSource, source);
        const stats = this.calculateDiffStats(diff);
        
        if (stats.identical) {
            statusElement.textContent = '동일';
            statusElement.className = 'panel-status identical';
        } else {
            const totalChanges = stats.added + stats.removed + stats.modified;
            statusElement.textContent = `${totalChanges}개 차이`;
            statusElement.className = 'panel-status different';
        }
    }

    // 모든 소스 상태 업데이트
    updateAllSourceStatuses() {
        const sources = [
            { id: 'devSource', statusId: 'devStatus' },
            { id: 'qaSource', statusId: 'qaStatus' },
            { id: 'stgSource', statusId: 'stgStatus' }
        ];

        sources.forEach(({ id, statusId }) => {
            this.updateSourceStatus(id, statusId);
        });
    }

    // 전체 비교 결과 업데이트
    updateOverallComparison() {
        const overallResult = document.getElementById('overallComparisonResult');
        const overallContent = document.getElementById('overallResultContent');
        
        if (!overallResult || !overallContent) return;

        // 모든 소스가 입력되었는지 확인
        const sources = [
            { id: 'devSource', name: '개발기' },
            { id: 'qaSource', name: 'QA' },
            { id: 'stgSource', name: 'STG' }
        ];

        const filledSources = sources.filter(({ id }) => this[id].trim());
        
        // 최소 2개 이상의 소스가 입력되어야 비교 가능
        if (filledSources.length < 2) {
            overallResult.style.display = 'none';
            return;
        }

        // 각 소스의 상태 확인
        const sourceStatuses = filledSources.map(({ id, name }) => {
            const diff = this.calculateDiff(this.prdSource, this[id]);
            const stats = this.calculateDiffStats(diff);
            return {
                name,
                isIdentical: stats.identical
            };
        });

        // 모든 소스가 동일한지 확인
        const allIdentical = sourceStatuses.every(status => status.isIdentical);
        
        if (allIdentical) {
            // 모두 동일한 경우
            const sourceNames = sourceStatuses.map(s => s.name).join(' / ');
            overallContent.innerHTML = `
                <div>🎉 ${sourceNames} 모두 동일!</div>
            `;
            overallContent.className = 'overall-result-content all-identical';
        } else {
            // 차이가 있는 경우
            const identicalSources = sourceStatuses.filter(s => s.isIdentical).map(s => s.name);
            const differentSources = sourceStatuses.filter(s => !s.isIdentical).map(s => s.name);
            
            let content = '';
            if (identicalSources.length > 0) {
                content += `<div class="source-list">✅ ${identicalSources.join(' / ')} 동일</div>`;
            }
            
            content += `<div class="gap-indicator">⚠️ GAP 차이 존재! [${differentSources.join(', ')}]</div>`;
            
            overallContent.innerHTML = content;
            overallContent.className = 'overall-result-content has-differences';
        }

        overallResult.style.display = 'block';
    }

    performRealTimeComparison() {
        if (!this.prdSource.trim()) {
            this.hideAllDiffIndicators();
            return;
        }

        // 각 소스와 PRD 비교
        this.compareWithPRD('devSource', 'devDiffIndicator');
        this.compareWithPRD('qaSource', 'qaDiffIndicator');
        this.compareWithPRD('stgSource', 'stgDiffIndicator');

        // 상세 diff 결과 업데이트
        this.updateDetailedDiff();
    }

    performFocusedComparison() {
        if (!this.prdSource.trim() || !this.currentFocus) {
            this.hideAllDiffIndicators();
            return;
        }

        // PRD 영역을 클릭했으면 모든 영역 비교
        if (this.currentFocus === 'prdSource') {
            this.performRealTimeComparison();
            return;
        }

        // 다른 영역을 클릭했으면 해당 영역과 PRD만 비교
        const focusMap = {
            'devSource': 'devDiffIndicator',
            'qaSource': 'qaDiffIndicator',
            'stgSource': 'stgDiffIndicator'
        };

        const indicatorId = focusMap[this.currentFocus];
        if (indicatorId) {
            this.compareWithPRD(this.currentFocus, indicatorId);
            this.updateFocusedDiff();
        }
    }

    compareWithPRD(sourceId, indicatorId) {
        const source = this[sourceId];
        const indicator = document.getElementById(indicatorId);
        
        if (!source.trim()) {
            this.hideDiffIndicator(indicator);
            return;
        }

        const diff = this.calculateDiff(this.prdSource, source);
        const stats = this.calculateDiffStats(diff);
        
        if (stats.identical) {
            this.showDiffIndicator(indicator, 'identical', '동일');
        } else {
            this.showDiffIndicator(indicator, 'different', `${stats.added + stats.removed + stats.modified}개 차이`);
        }
    }

    calculateDiff(text1, text2) {
        // 텍스트를 라인으로 분할하고 공백 정규화
        const lines1 = this.normalizeLines(text1.split('\n'));
        const lines2 = this.normalizeLines(text2.split('\n'));
        
        const diff = [];
        let i = 0, j = 0;
        
        while (i < lines1.length || j < lines2.length) {
            if (i >= lines1.length) {
                // 텍스트1이 끝남 - 텍스트2의 나머지 라인들은 추가됨
                if (!this.isEmptyLine(lines2[j])) {
                    diff.push({
                        type: 'added',
                        line1: null,
                        line2: j + 1,
                        content: lines2[j]
                    });
                }
                j++;
            } else if (j >= lines2.length) {
                // 텍스트2가 끝남 - 텍스트1의 나머지 라인들은 삭제됨
                if (!this.isEmptyLine(lines1[i])) {
                    diff.push({
                        type: 'removed',
                        line1: i + 1,
                        line2: null,
                        content: lines1[i]
                    });
                }
                i++;
            } else if (this.areLinesEqual(lines1[i], lines2[j])) {
                // 동일한 라인 (공백 정규화 후)
                diff.push({
                    type: 'unchanged',
                    line1: i + 1,
                    line2: j + 1,
                    content: lines1[i]
                });
                i++;
                j++;
            } else {
                // 다른 라인 - 더 정교한 비교를 위해 다음 몇 라인을 확인
                const result = this.findBestMatch(lines1, lines2, i, j);
                if (result.type === 'removed') {
                    if (!this.isEmptyLine(lines1[i])) {
                        diff.push({
                            type: 'removed',
                            line1: i + 1,
                            line2: null,
                            content: lines1[i]
                        });
                    }
                    i++;
                } else if (result.type === 'added') {
                    if (!this.isEmptyLine(lines2[j])) {
                        diff.push({
                            type: 'added',
                            line1: null,
                            line2: j + 1,
                            content: lines2[j]
                        });
                    }
                    j++;
                } else {
                    // 수정된 라인으로 처리
                    if (!this.isEmptyLine(lines1[i]) || !this.isEmptyLine(lines2[j])) {
                        diff.push({
                            type: 'modified',
                            line1: i + 1,
                            line2: j + 1,
                            content: lines2[j],
                            originalContent: lines1[i]
                        });
                    }
                    i++;
                    j++;
                }
            }
        }
        
        return diff;
    }

    // 라인 정규화 함수
    normalizeLines(lines) {
        return lines.map(line => {
            // 앞뒤 공백 제거
            const trimmed = line.trim();
            // 연속된 공백을 하나로 압축
            return trimmed.replace(/\s+/g, ' ');
        });
    }

    // 빈 라인인지 확인
    isEmptyLine(line) {
        return !line || line.trim() === '';
    }

    // 두 라인이 동일한지 확인 (공백 정규화 후)
    areLinesEqual(line1, line2) {
        const normalized1 = line1.trim().replace(/\s+/g, ' ');
        const normalized2 = line2.trim().replace(/\s+/g, ' ');
        return normalized1 === normalized2;
    }

    findBestMatch(lines1, lines2, start1, start2) {
        const lookAhead = Math.min(3, Math.min(lines1.length - start1, lines2.length - start2));
        
        // 다음 몇 라인을 확인하여 더 나은 매치를 찾음
        for (let k = 1; k <= lookAhead; k++) {
            if (start1 + k < lines1.length && this.areLinesEqual(lines1[start1 + k], lines2[start2])) {
                return { type: 'removed' };
            }
            if (start2 + k < lines2.length && this.areLinesEqual(lines1[start1], lines2[start2 + k])) {
                return { type: 'added' };
            }
        }
        
        // 빈 라인들은 무시하고 유사도 계산
        if (this.isEmptyLine(lines1[start1]) && this.isEmptyLine(lines2[start2])) {
            return { type: 'unchanged' };
        }
        
        // 유사도가 높으면 수정으로, 아니면 삭제로 처리
        const similarity = this.calculateSimilarity(lines1[start1], lines2[start2]);
        return similarity > 0.3 ? { type: 'modified' } : { type: 'removed' };
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    calculateDiffStats(diff) {
        const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
        
        diff.forEach(line => {
            // 빈 라인이 아닌 경우만 통계에 포함
            if (line.type === 'added' && !this.isEmptyLine(line.content)) {
                stats.added++;
            } else if (line.type === 'removed' && !this.isEmptyLine(line.content)) {
                stats.removed++;
            } else if (line.type === 'modified' && (!this.isEmptyLine(line.content) || !this.isEmptyLine(line.originalContent))) {
                stats.modified++;
            } else if (line.type === 'unchanged') {
                stats.unchanged++;
            }
        });
        
        stats.identical = stats.added === 0 && stats.removed === 0 && stats.modified === 0;
        
        return stats;
    }

    showDiffIndicator(indicator, type, text) {
        indicator.textContent = text;
        indicator.className = `diff-indicator show ${type}`;
    }

    hideDiffIndicator(indicator) {
        indicator.className = 'diff-indicator';
    }

    hideAllDiffIndicators() {
        const indicators = ['devDiffIndicator', 'qaDiffIndicator', 'stgDiffIndicator'];
        indicators.forEach(id => {
            this.hideDiffIndicator(document.getElementById(id));
        });
    }

    updateDetailedDiff() {
        const diffResults = document.getElementById('diffResults');
        
        if (!this.prdSource.trim()) {
            diffResults.style.display = 'none';
            this.diffLines = [];
            this.currentDiffIndex = -1;
            return;
        }

        this.diffLines = []; // diff 라인 초기화
        
        const sources = [
            { name: '개발기', source: this.devSource, color: '#2196F3' },
            { name: 'QA', source: this.qaSource, color: '#FF9800' },
            { name: 'STG', source: this.stgSource, color: '#9C27B0' }
        ];

        // 현재 포커스된 소스가 있으면 그것과 비교, 없으면 첫 번째 소스와 비교
        let targetSource = null;
        
        if (this.currentFocus && this.currentFocus !== 'prdSource') {
            const focusMap = {
                'devSource': { name: '개발기', source: this.devSource, color: '#2196F3' },
                'qaSource': { name: 'QA', source: this.qaSource, color: '#FF9800' },
                'stgSource': { name: 'STG', source: this.stgSource, color: '#9C27B0' }
            };
            
            const focusInfo = focusMap[this.currentFocus];
            if (focusInfo && focusInfo.source.trim()) {
                targetSource = focusInfo;
            }
        }
        
        if (!targetSource) {
            targetSource = sources.find(({ source }) => source.trim());
        }
        
        if (targetSource) {
            this.updateComparisonPanels(targetSource);
            diffResults.style.display = 'block';
            
            // 헤더 요약 정보 업데이트
            this.updateDiffSummary(sources);
        } else {
            diffResults.style.display = 'none';
            this.diffLines = [];
            this.currentDiffIndex = -1;
        }
    }

    updateFocusedDiff() {
        const diffResults = document.getElementById('diffResults');
        
        if (!this.prdSource.trim() || !this.currentFocus || this.currentFocus === 'prdSource') {
            this.updateDetailedDiff();
            return;
        }

        const focusMap = {
            'devSource': { name: '개발기', color: '#2196F3' },
            'qaSource': { name: 'QA', color: '#FF9800' },
            'stgSource': { name: 'STG', color: '#9C27B0' }
        };

        const focusInfo = focusMap[this.currentFocus];
        if (!focusInfo) return;

        const source = this[this.currentFocus];
        if (!source.trim()) {
            diffResults.style.display = 'none';
            this.diffLines = [];
            this.currentDiffIndex = -1;
            return;
        }

        // 포커스된 소스와 비교 패널 업데이트
        this.updateComparisonPanels(focusInfo);
        diffResults.style.display = 'block';
        
        // 헤더 요약 정보 업데이트 (포커스된 것만)
        this.updateDiffSummary([focusInfo]);
    }

    // 특정 소스와 비교 패널 업데이트
    updateComparisonWithSource(sourceId) {
        console.log('updateComparisonWithSource called with:', sourceId); // 디버깅용
        
        const focusMap = {
            'devSource': { name: '개발기', color: '#2196F3' },
            'qaSource': { name: 'QA', color: '#FF9800' },
            'stgSource': { name: 'STG', color: '#9C27B0' }
        };

        const sourceInfo = focusMap[sourceId];
        if (!sourceInfo) {
            console.log('No source info found for:', sourceId);
            return;
        }

        const source = this[sourceId];
        console.log('Source content length:', source ? source.length : 0); // 디버깅용
        
        if (!source.trim()) {
            console.log('Source is empty for:', sourceId);
            return;
        }

        // 해당 소스 정보로 업데이트
        const sourceInfoWithSource = {
            ...sourceInfo,
            source: source
        };

        console.log('Updating comparison panels with:', sourceInfoWithSource.name); // 디버깅용
        this.updateComparisonPanels(sourceInfoWithSource);
        
        // diff 결과 표시
        const diffResults = document.getElementById('diffResults');
        if (diffResults) {
            diffResults.style.display = 'block';
        }
    }

    // 비교 패널 업데이트
    updateComparisonPanels(sourceInfo) {
        console.log('updateComparisonPanels called with:', sourceInfo); // 디버깅용
        
        const prdDiffContent = document.getElementById('prdDiffContent');
        const compareDiffContent = document.getElementById('compareDiffContent');
        const compareSourceTitle = document.getElementById('compareSourceTitle');
        const prdDiffStats = document.getElementById('prdDiffStats');
        const compareDiffStats = document.getElementById('compareDiffStats');
        
        if (!prdDiffContent || !compareDiffContent) {
            console.log('Required elements not found');
            return;
        }
        
        // PRD 소스 표시
        const prdLines = this.prdSource.split('\n');
        const prdContent = this.generateComparisonContent(prdLines, 'prd');
        prdDiffContent.innerHTML = prdContent;
        prdDiffStats.textContent = `${prdLines.length}줄`;
        
        // 비교 소스 표시
        const compareLines = sourceInfo.source.split('\n');
        console.log('Compare lines count:', compareLines.length); // 디버깅용
        const compareContent = this.generateComparisonContent(compareLines, 'compare');
        compareDiffContent.innerHTML = compareContent;
        compareDiffStats.textContent = `${compareLines.length}줄`;
        
        // 제목 업데이트
        const iconMap = {
            '개발기': '🔧',
            'QA': '🧪',
            'STG': '🚀'
        };
        const newTitle = `${iconMap[sourceInfo.name] || '📄'} ${sourceInfo.name} 소스`;
        console.log('Updating title to:', newTitle); // 디버깅용
        compareSourceTitle.textContent = newTitle;
        
        // 차이점 계산 및 하이라이트
        this.highlightDifferences(prdLines, compareLines);
    }

    // 비교용 콘텐츠 생성
    generateComparisonContent(lines, type) {
        let content = '';
        lines.forEach((line, index) => {
            content += `
                <div class="diff-line-comparison" data-line="${index}" data-type="${type}">
                    <div class="diff-line-number">${index + 1}</div>
                    <div class="diff-line-content">${this.escapeHtml(line)}</div>
                </div>
            `;
        });
        return content;
    }

    // 차이점 하이라이트
    highlightDifferences(prdLines, compareLines) {
        const diff = this.calculateDiff(this.prdSource, compareLines.join('\n'));
        this.diffLines = [];
        
        // PRD 패널의 라인들
        const prdLineElements = document.querySelectorAll('.diff-line-comparison[data-type="prd"]');
        // 비교 패널의 라인들
        const compareLineElements = document.querySelectorAll('.diff-line-comparison[data-type="compare"]');
        
        let prdIndex = 0;
        let compareIndex = 0;
        
        diff.forEach((diffLine, index) => {
            if (diffLine.type === 'added') {
                // 추가된 라인 - 비교 패널에만 표시
                if (compareIndex < compareLineElements.length) {
                    const element = compareLineElements[compareIndex];
                    element.classList.add('added');
                    this.diffLines.push({
                        element: element,
                        line: diffLine,
                        index: index,
                        prdElement: null,
                        compareElement: element
                    });
                    compareIndex++;
                }
            } else if (diffLine.type === 'removed') {
                // 삭제된 라인 - PRD 패널에만 표시
                if (prdIndex < prdLineElements.length) {
                    const element = prdLineElements[prdIndex];
                    element.classList.add('removed');
                    this.diffLines.push({
                        element: element,
                        line: diffLine,
                        index: index,
                        prdElement: element,
                        compareElement: null
                    });
                    prdIndex++;
                }
            } else if (diffLine.type === 'modified') {
                // 수정된 라인 - 양쪽 모두 표시
                if (prdIndex < prdLineElements.length && compareIndex < compareLineElements.length) {
                    const prdElement = prdLineElements[prdIndex];
                    const compareElement = compareLineElements[compareIndex];
                    
                    prdElement.classList.add('modified');
                    compareElement.classList.add('modified');
                    
                    this.diffLines.push({
                        element: compareElement,
                        line: diffLine,
                        index: index,
                        prdElement: prdElement,
                        compareElement: compareElement
                    });
                    
                    prdIndex++;
                    compareIndex++;
                }
            } else {
                // 동일한 라인
                if (prdIndex < prdLineElements.length && compareIndex < compareLineElements.length) {
                    prdLineElements[prdIndex].classList.add('unchanged');
                    compareLineElements[compareIndex].classList.add('unchanged');
                    prdIndex++;
                    compareIndex++;
                }
            }
        });
    }

    // 헤더 요약 정보 업데이트
    updateDiffSummary(sources) {
        const diffSummary = document.getElementById('diffSummary');
        if (!diffSummary) return;

        let summaryHTML = '';
        
        sources.forEach(({ name, source, color }) => {
            if (source.trim()) {
                const diff = this.calculateDiff(this.prdSource, source);
                const stats = this.calculateDiffStats(diff);
                
                const hasChanges = stats.added > 0 || stats.removed > 0 || stats.modified > 0;
                const className = this.getSourceClassName(name);
                
                let statsHTML = '';
                if (hasChanges) {
                    statsHTML = `
                        <div class="diff-summary-stats">
                            ${stats.added > 0 ? `<span class="diff-summary-stat">+${stats.added}</span>` : ''}
                            ${stats.removed > 0 ? `<span class="diff-summary-stat">-${stats.removed}</span>` : ''}
                            ${stats.modified > 0 ? `<span class="diff-summary-stat">~${stats.modified}</span>` : ''}
                        </div>
                    `;
                }
                
                summaryHTML += `
                    <div class="diff-summary-item ${className}" data-source="${name}">
                        <span>${name}</span>
                        ${hasChanges ? statsHTML : '<span class="diff-summary-stat">동일</span>'}
                    </div>
                `;
            }
        });
        
        diffSummary.innerHTML = summaryHTML;
        
        // 클릭 이벤트 추가 (해당 소스와 비교)
        diffSummary.querySelectorAll('.diff-summary-item').forEach(item => {
            item.addEventListener('click', () => {
                const sourceName = item.dataset.source;
                this.switchToSource(sourceName);
            });
        });
    }

    // 소스 이름에 따른 CSS 클래스명 반환
    getSourceClassName(name) {
        const classMap = {
            '개발기': 'dev',
            'QA': 'qa',
            'STG': 'stg'
        };
        return classMap[name] || '';
    }

    // 특정 소스로 전환
    switchToSource(sourceName) {
        const nameToIdMap = {
            '개발기': 'devSource',
            'QA': 'qaSource',
            'STG': 'stgSource'
        };

        const sourceId = nameToIdMap[sourceName];
        if (sourceId && this[sourceId].trim()) {
            // 해당 소스로 포커스 설정
            this.setFocus(sourceId);
            
            // 해당 소스와 비교
            this.updateComparisonWithSource(sourceId);
            
            // 요약 정보 업데이트
            const focusMap = {
                'devSource': { name: '개발기', color: '#2196F3' },
                'qaSource': { name: 'QA', color: '#FF9800' },
                'stgSource': { name: 'STG', color: '#9C27B0' }
            };
            
            const sourceInfo = focusMap[sourceId];
            if (sourceInfo) {
                this.updateDiffSummary([sourceInfo]);
            }
        }
    }

    // 특정 소스 섹션으로 스크롤
    scrollToSourceSection(sourceName) {
        const headers = document.querySelectorAll('.comparison-section-header');
        const section = Array.from(headers).find(header => 
            header.textContent.includes(sourceName)
        );
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    linkDiffElements() {
        // 현재 diffLines는 이미 올바르게 설정되어 있음
        // 현재 선택된 차이점 초기화
        this.currentDiffIndex = -1;
    }

    generateDiffSection(name, diff, stats, color) {
        let content = `
            <div class="comparison-section">
                <div class="comparison-section-header" style="border-left-color: ${color}">
                    ${name} 소스 비교 결과
                </div>
                <div class="diff-stats">
                    <div class="stat-item added">추가: ${stats.added}</div>
                    <div class="stat-item removed">삭제: ${stats.removed}</div>
                    <div class="stat-item modified">수정: ${stats.modified}</div>
                    <div class="stat-item">동일: ${stats.unchanged}</div>
                </div>
                <div class="diff-lines">
        `;

        diff.forEach((line, index) => {
            content += this.generateDiffLine(line, index);
        });

        content += `
                </div>
            </div>
        `;

        return content;
    }

    generateDiffLine(line, index) {
        const lineNumber1 = line.line1 ? line.line1 : '';
        const lineNumber2 = line.line2 ? line.line2 : '';
        
        let content = line.content;
        if (line.type === 'modified' && line.originalContent) {
            content = `${line.originalContent} → ${line.content}`;
        }

        return `
            <div class="diff-line ${line.type}" data-line="${index}">
                <div class="diff-line-number ${line.type}">${lineNumber1}</div>
                <div class="diff-line-number ${line.type}">${lineNumber2}</div>
                <div class="diff-line-content ${line.type}">${this.escapeHtml(content)}</div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleDiffResults() {
        const diffResults = document.getElementById('diffResults');
        const toggleBtn = document.getElementById('toggleDiff');
        
        if (diffResults.style.display === 'none') {
            diffResults.style.display = 'block';
            toggleBtn.textContent = '숨기기';
        } else {
            diffResults.style.display = 'none';
            toggleBtn.textContent = '보기';
        }
    }

    // 다음 차이점으로 이동
    goToNextDiff() {
        console.log('goToNextDiff called'); // 디버깅용
        
        // 현재 diffLines가 비어있으면 다시 찾기
        if (this.diffLines.length === 0) {
            this.findAllDiffElements();
        }
        
        if (this.diffLines.length === 0) {
            this.showNoDiffMessage();
            return;
        }
        
        // 현재 선택된 차이점 하이라이트 제거
        this.clearCurrentDiffHighlight();
        
        // 다음 차이점으로 이동
        this.currentDiffIndex = (this.currentDiffIndex + 1) % this.diffLines.length;
        
        // 새로운 차이점 하이라이트
        this.highlightCurrentDiff();
    }

    // 이전 차이점으로 이동
    goToPreviousDiff() {
        console.log('goToPreviousDiff called'); // 디버깅용
        
        // 현재 diffLines가 비어있으면 다시 찾기
        if (this.diffLines.length === 0) {
            this.findAllDiffElements();
        }
        
        if (this.diffLines.length === 0) {
            this.showNoDiffMessage();
            return;
        }
        
        // 현재 선택된 차이점 하이라이트 제거
        this.clearCurrentDiffHighlight();
        
        // 이전 차이점으로 이동
        this.currentDiffIndex = this.currentDiffIndex <= 0 ? this.diffLines.length - 1 : this.currentDiffIndex - 1;
        
        // 새로운 차이점 하이라이트
        this.highlightCurrentDiff();
    }

    // 모든 차이나는 라인들을 찾기
    findAllDiffElements() {
        this.diffLines = [];
        
        // PRD 패널의 차이나는 라인들
        const prdDiffLines = document.querySelectorAll('.diff-line-comparison[data-type="prd"].added, .diff-line-comparison[data-type="prd"].removed, .diff-line-comparison[data-type="prd"].modified');
        
        // 비교 패널의 차이나는 라인들
        const compareDiffLines = document.querySelectorAll('.diff-line-comparison[data-type="compare"].added, .diff-line-comparison[data-type="compare"].removed, .diff-line-comparison[data-type="compare"].modified');
        
        // PRD 패널의 차이점들 추가
        prdDiffLines.forEach((element, index) => {
            this.diffLines.push({
                element: element,
                line: null,
                index: index,
                prdElement: element,
                compareElement: null
            });
        });
        
        // 비교 패널의 차이점들 추가
        compareDiffLines.forEach((element, index) => {
            this.diffLines.push({
                element: element,
                line: null,
                index: prdDiffLines.length + index,
                prdElement: null,
                compareElement: element
            });
        });
        
        console.log('Found diff elements:', this.diffLines.length); // 디버깅용
    }

    // 차이점이 없을 때 메시지 표시
    showNoDiffMessage() {
        const existingHint = document.querySelector('.navigation-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        const hint = document.createElement('div');
        hint.className = 'navigation-hint';
        hint.innerHTML = '차이점이 없습니다';
        hint.style.background = 'rgba(76, 175, 80, 0.9)';
        
        document.body.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 2000);
    }

    // 현재 차이점 하이라이트
    highlightCurrentDiff() {
        console.log('highlightCurrentDiff called, currentDiffIndex:', this.currentDiffIndex, 'total diffLines:', this.diffLines.length); // 디버깅용
        
        if (this.currentDiffIndex >= 0 && this.currentDiffIndex < this.diffLines.length) {
            const diffLine = this.diffLines[this.currentDiffIndex];
            console.log('Current diff line:', diffLine); // 디버깅용
            
            if (diffLine.element) {
                // 기존 하이라이트 모두 제거
                document.querySelectorAll('.diff-highlighted').forEach(el => {
                    el.classList.remove('diff-highlighted');
                });
                
                // 현재 차이점 하이라이트
                diffLine.element.classList.add('diff-highlighted');
                
                // 좌우 패널 동기화 스크롤
                this.syncScrollToDiff(diffLine);
                
                // 네비게이션 안내 표시
                this.showNavigationHint();
            } else {
                console.log('No element found for diff line'); // 디버깅용
            }
        } else {
            console.log('Invalid diff index or no diff lines'); // 디버깅용
        }
    }

    // 차이점으로 좌우 패널 동기화 스크롤
    syncScrollToDiff(diffLine) {
        console.log('syncScrollToDiff called with:', diffLine); // 디버깅용
        
        // PRD 패널과 비교 패널의 요소들
        const prdElement = diffLine.prdElement;
        const compareElement = diffLine.compareElement;
        
        console.log('PRD element:', prdElement, 'Compare element:', compareElement); // 디버깅용
        
        // PRD 패널 요소가 있으면 하이라이트하고 스크롤
        if (prdElement) {
            prdElement.classList.add('diff-highlighted');
            prdElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('Scrolled to PRD element'); // 디버깅용
        }
        
        // 비교 패널 요소가 있으면 하이라이트하고 스크롤
        if (compareElement) {
            compareElement.classList.add('diff-highlighted');
            compareElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('Scrolled to Compare element'); // 디버깅용
        }
    }

    // 차이점의 라인 번호 가져오기
    getDiffLineNumber(diffLine) {
        if (diffLine.line && diffLine.line.line1) {
            return diffLine.line.line1;
        } else if (diffLine.line && diffLine.line.line2) {
            return diffLine.line.line2;
        }
        return null;
    }

    // 현재 차이점 하이라이트 제거
    clearCurrentDiffHighlight() {
        // 모든 하이라이트 제거
        document.querySelectorAll('.diff-highlighted').forEach(el => {
            el.classList.remove('diff-highlighted');
        });
    }

    // 네비게이션 안내 표시
    showNavigationHint() {
        if (this.diffLines.length === 0) return;
        
        const current = this.currentDiffIndex + 1;
        const total = this.diffLines.length;
        
        // 기존 안내 제거
        const existingHint = document.querySelector('.navigation-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        // 새 안내 생성
        const hint = document.createElement('div');
        hint.className = 'navigation-hint';
        hint.innerHTML = `
            차이점 ${current}/${total} 
            <span class="key">F7</span> 이전 
            <span class="key">F8</span> 다음
        `;
        
        document.body.appendChild(hint);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 2000);
    }
}

// 페이지 로드 시 시스템 초기화
let diffSystem;
document.addEventListener('DOMContentLoaded', () => {
    diffSystem = new RealTimeDiffSystem();
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    // F7, F8 키 처리
    if (e.key === 'F7') {
        e.preventDefault();
        if (diffSystem) {
            diffSystem.goToPreviousDiff();
        }
        return;
    }
    
    if (e.key === 'F8') {
        e.preventDefault();
        if (diffSystem) {
            diffSystem.goToNextDiff();
        }
        return;
    }
    
    // Ctrl/Cmd 키 조합
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                document.getElementById('prdSource').focus();
                break;
            case '2':
                e.preventDefault();
                document.getElementById('devSource').focus();
                break;
            case '3':
                e.preventDefault();
                document.getElementById('qaSource').focus();
                break;
            case '4':
                e.preventDefault();
                document.getElementById('stgSource').focus();
                break;
            case 'd':
                e.preventDefault();
                document.getElementById('toggleDiff').click();
                break;
        }
    }
});

// 유틸리티 함수들
function clearAllSources() {
    const textareas = ['prdSource', 'devSource', 'qaSource', 'stgSource'];
    textareas.forEach(id => {
        document.getElementById(id).value = '';
    });
    
    // 시스템 재초기화
    if (window.diffSystem) {
        window.diffSystem = new RealTimeDiffSystem();
    }
}

function exportDiff() {
    const diffContent = document.getElementById('diffContent');
    if (!diffContent) return;
    
    const diffText = diffContent.textContent;
    const blob = new Blob([diffText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}